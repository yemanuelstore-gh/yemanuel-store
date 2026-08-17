-- Quotations module.
--
-- Sales quotations: a quotation is a sales proposal and never affects
-- inventory, stock movements, payments or customer balances. Stock is only
-- touched through the normal order-processing workflow after a quotation is
-- converted to an order (orders.status -> 'processing').
--
-- Mirrors the orders/order_items design (stage_7_sales) so the totals and
-- item snapshots share the same money semantics (numeric(14,2), zero-tax
-- compatible) and can be copied verbatim into an order at conversion time.
-- Idempotent: safe to re-run.

set search_path = public, extensions;

create type public.quotation_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');

create sequence app.seq_qt;
grant usage on sequence app.seq_qt to service_role;

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  quotation_number text not null unique,
  customer_id uuid references public.customers (id),
  guest_name text,
  guest_phone text,
  status public.quotation_status not null default 'draft',
  quotation_date date not null default current_date,
  valid_until date not null,
  subtotal numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  taxable_amount numeric(14, 2) not null default 0,
  tax_amount numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2),
  total_amount numeric(14, 2) not null default 0,
  customer_notes text,
  internal_notes text,
  terms text,
  payment_terms text,
  delivery_notes text,
  status_changed_at timestamptz,
  converted_order_id uuid references public.orders (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  quantity numeric(14, 3) not null,
  product_name text not null,
  variant_name text not null,
  sku text not null,
  options jsonb,
  unit_price numeric(14, 2) not null,
  discount_amount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null,
  taxable_amount numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2),
  tax_amount numeric(14, 2) not null default 0,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger quotations_set_updated_at
before update on public.quotations
for each row execute function app.set_updated_at();

create trigger quotation_items_set_updated_at
before update on public.quotation_items
for each row execute function app.set_updated_at();

create index quotations_status_idx on public.quotations (status);
create index quotations_customer_id_idx on public.quotations (customer_id);
create index quotations_quotation_date_idx on public.quotations (quotation_date);
create index quotations_converted_order_id_idx on public.quotations (converted_order_id);
create index quotation_items_quotation_id_idx on public.quotation_items (quotation_id);

alter table public.quotations enable row level security;
alter table public.quotation_items enable row level security;

create policy p_quotations_staff_select on public.quotations
for select to authenticated using (app.has_permission('sales.read'));
create policy p_quotations_staff_insert on public.quotations
for insert to authenticated with check (app.has_permission('sales.create'));
create policy p_quotations_staff_update on public.quotations
for update to authenticated using (app.has_permission('sales.update')) with check (app.has_permission('sales.update'));

create policy p_quotation_items_staff_select on public.quotation_items
for select to authenticated using (app.has_permission('sales.read'));
create policy p_quotation_items_staff_insert on public.quotation_items
for insert to authenticated with check (app.has_permission('sales.create'));
create policy p_quotation_items_staff_update on public.quotation_items
for update to authenticated using (app.has_permission('sales.update')) with check (app.has_permission('sales.update'));
create policy p_quotation_items_staff_delete on public.quotation_items
for delete to authenticated using (app.has_permission('sales.update'));