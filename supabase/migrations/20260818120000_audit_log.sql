-- Yemanuel Store - Audit Log
-- Immutable application-level audit trail for business records.
--
-- Compatible with the EXISTING audit infrastructure (see
-- 20260815000009_stage_10_audit_rls_indexes.sql):
--   * public.audit_logs already exists with columns
--     id, actor_id, action, entity_type, entity_id, before, after,
--     metadata, created_at
--   * app.write_audit_log(...) RPC is the app-facing writer (service_role)
--   * RLS policy p_audit_logs_staff_select governs staff reads
--
-- This migration adds an automatic trigger-based trail for business tables
-- writing through the same table, plus supporting indexes. It is idempotent:
-- every statement is safe to re-run, and the trigger function never breaks
-- the primary operation (audit writes are best-effort).

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  before jsonb,
  after jsonb,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_actor_id_idx
  on public.audit_logs (actor_id);

create index if not exists audit_logs_entity_type_entity_id_idx
  on public.audit_logs (entity_type, entity_id);

create index if not exists audit_logs_action_idx
  on public.audit_logs (action);

alter table public.audit_logs enable row level security;

-- Reads are governed by the existing p_audit_logs_staff_select policy
-- (app.has_permission('reports.view') or app.has_permission('audit.view')).
-- Drop the legacy policy name in case an earlier partial attempt created it.
drop policy if exists audit_logs_select on public.audit_logs;

-- Audit records are written by triggers / the app.write_audit_log RPC, not
-- directly by users. No INSERT/UPDATE/DELETE policies are provided.

create or replace function public.audit_log_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_record_id text;
  v_entity_id uuid;
  v_module text;
begin

  if TG_OP = 'DELETE' then
    v_old := to_jsonb(OLD);
    v_record_id := coalesce(v_old->>'id', v_old->>'uuid');
  elsif TG_OP = 'UPDATE' then
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := coalesce(v_new->>'id', v_old->>'id');
  else
    v_new := to_jsonb(NEW);
    v_record_id := coalesce(v_new->>'id', v_new->>'uuid');
  end if;

  if v_record_id is not null
     and v_record_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    v_entity_id := v_record_id::uuid;
  end if;

  v_module := case
    when TG_TABLE_NAME in (
      'customers',
      'orders',
      'order_items',
      'payments',
      'deliveries',
      'returns',
      'return_items',
      'refunds'
    ) then 'Sales'

    when TG_TABLE_NAME in (
      'suppliers',
      'purchase_orders',
      'purchase_order_items',
      'goods_receipts',
      'goods_receipt_items',
      'supplier_invoices',
      'purchase_payments'
    ) then 'Purchasing'

    when TG_TABLE_NAME in (
      'products',
      'product_variants',
      'inventory_items',
      'stock_movements',
      'inventory_locations'
    ) then 'Inventory'

    when TG_TABLE_NAME in (
      'bank_accounts',
      'mobile_money_accounts',
      'account_transactions',
      'expenses'
    ) then 'Finance'

    when TG_TABLE_NAME in (
      'employees',
      'departments'
    ) then 'HR'

    else 'System'
  end;

  if v_entity_id is not null then
    begin
      insert into public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        before,
        after,
        metadata
      )
      values (
        auth.uid(),
        lower(TG_OP),
        TG_TABLE_NAME,
        v_entity_id,
        v_old,
        v_new,
        jsonb_build_object(
          'module', v_module,
          'description', initcap(lower(TG_OP)) || ' on ' || TG_TABLE_NAME
        )
      );
    exception when others then
      -- Audit logging is best-effort and must never break the primary write.
      null;
    end;
  end if;

  if TG_OP = 'DELETE' then
    return OLD;
  end if;

  return NEW;
end;
$$;

-- Attach audit triggers only where the tables currently exist.
do $$
declare
  t text;
  tables_to_audit text[] := array[
    'customers',
    'suppliers',
    'orders',
    'order_items',
    'payments',
    'deliveries',
    'returns',
    'return_items',
    'refunds',
    'expenses',
    'purchase_orders',
    'purchase_order_items',
    'goods_receipts',
    'goods_receipt_items',
    'supplier_invoices',
    'purchase_payments',
    'products',
    'product_variants',
    'inventory_items',
    'stock_movements',
    'inventory_locations',
    'bank_accounts',
    'mobile_money_accounts',
    'account_transactions',
    'employees',
    'departments'
  ];
begin
  foreach t in array tables_to_audit loop
    if to_regclass('public.' || t) is not null then
      execute format(
        'drop trigger if exists audit_%I on public.%I',
        t,
        t
      );

      execute format(
        'create trigger audit_%I
         after insert or update or delete
         on public.%I
         for each row
         execute function public.audit_log_trigger()',
        t,
        t
      );
    end if;
  end loop;
end;
$$;

-- Audit records themselves cannot be modified or deleted through the API.
revoke insert, update, delete on public.audit_logs
from authenticated, anon;

grant select on public.audit_logs to authenticated;
grant select on public.audit_logs to service_role;

grant execute on function public.audit_log_trigger() to service_role;
