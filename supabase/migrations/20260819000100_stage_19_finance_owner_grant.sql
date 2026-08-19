-- Stage 19: Backfill finance.read for the Owner/Administrator role.
--
-- Stage 18 (financial accounts) created the tables and RLS policies but the
-- permission grant portion was not applied in some environments — the
-- `finance.read` permission and its owner role grant are missing from the
-- live database, so the Owner is blocked from Financial Accounts, Payables,
-- Receivables and Payments (all gated on `finance.read`).
--
-- This migration idempotently backfills the permission and grants it to the
-- Owner/Administrator role only. No other staff role is touched, so the
-- permission system for other staff is preserved — they receive finance.read
-- only when an administrator explicitly grants it via role management.
--
-- Idempotent: safe to re-run.

set search_path = public;

-- 1. Ensure the permission exists.
insert into public.permissions (code, description)
values ('finance.read', 'View financial accounts, balances and transactions')
on conflict (code) do nothing;

-- 2. Grant it to the Owner (and any role explicitly coded/administrator).
--    System roles have `is_system` true; the owner is seeded as `is_system`.
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where p.code = 'finance.read'
  and (
    r.code = 'owner'
    or r.code = 'administrator'
    or lower(r.name) in ('owner', 'administrator')
  )
on conflict do nothing;