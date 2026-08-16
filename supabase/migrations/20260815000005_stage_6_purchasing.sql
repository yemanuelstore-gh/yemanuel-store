create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  supplier_code text not null unique,
  name text not null,
  contact_person text,
  phone text not null,
  email text,
  website text,
  status public.entity_status not null default 'active',
  payment_terms_days integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.supplier_contacts (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  name text not null,
  role text,
  phone text not null,
  email text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_addresses (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  label text,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  region_id uuid not null references public.regions (id),
  postal_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_products (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  supplier_sku text,
  supplier_product_name text,
  last_cost numeric(14, 2),
  preferred_supplier boolean not null default false,
  lead_time_days integer,
  minimum_order_quantity numeric(14, 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint supplier_products_supplier_variant_unique unique (supplier_id, variant_id)
);

create index supplier_products_variant_idx on public.supplier_products (variant_id);
create unique index supplier_products_one_preferred_per_variant on public.supplier_products (variant_id) where preferred_supplier;

create table public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique,
  supplier_id uuid not null references public.suppliers (id),
  location_id uuid not null references public.locations (id),
  status public.purchase_order_status not null default 'draft',
  expected_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id),
  approved_by uuid references auth.users (id)
);

create table public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references public.purchase_orders (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  quantity_ordered numeric(14, 3) not null,
  unit_cost_expected numeric(14, 2) not null,
  quantity_received numeric(14, 3) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.goods_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_number text not null unique,
  purchase_order_id uuid references public.purchase_orders (id),
  location_id uuid not null references public.locations (id),
  received_date date not null,
  status public.goods_receipt_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.goods_receipt_items (
  id uuid primary key default gen_random_uuid(),
  goods_receipt_id uuid not null references public.goods_receipts (id) on delete cascade,
  purchase_order_item_id uuid references public.purchase_order_items (id),
  variant_id uuid not null references public.product_variants (id),
  quantity_received numeric(14, 3) not null,
  unit_cost_actual numeric(14, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.supplier_invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null,
  supplier_id uuid not null references public.suppliers (id),
  purchase_order_id uuid references public.purchase_orders (id),
  invoice_date date not null,
  due_date date,
  amount numeric(14, 2) not null,
  status public.invoice_status not null default 'pending',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.purchase_payments (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid not null references public.suppliers (id),
  invoice_id uuid references public.supplier_invoices (id),
  purchase_order_id uuid references public.purchase_orders (id),
  amount numeric(14, 2) not null,
  payment_date date not null,
  method public.payment_method not null,
  reference text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create trigger suppliers_set_updated_at
before update on public.suppliers
for each row execute function app.set_updated_at();

create trigger supplier_contacts_set_updated_at
before update on public.supplier_contacts
for each row execute function app.set_updated_at();

create trigger supplier_addresses_set_updated_at
before update on public.supplier_addresses
for each row execute function app.set_updated_at();

create trigger supplier_products_set_updated_at
before update on public.supplier_products
for each row execute function app.set_updated_at();

create trigger purchase_orders_set_updated_at
before update on public.purchase_orders
for each row execute function app.set_updated_at();

create trigger purchase_order_items_set_updated_at
before update on public.purchase_order_items
for each row execute function app.set_updated_at();

create trigger goods_receipts_set_updated_at
before update on public.goods_receipts
for each row execute function app.set_updated_at();

create trigger goods_receipt_items_set_updated_at
before update on public.goods_receipt_items
for each row execute function app.set_updated_at();

create trigger supplier_invoices_set_updated_at
before update on public.supplier_invoices
for each row execute function app.set_updated_at();

create trigger purchase_payments_set_updated_at
before update on public.purchase_payments
for each row execute function app.set_updated_at();