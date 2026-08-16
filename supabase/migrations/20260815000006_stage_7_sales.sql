create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers (id),
  channel public.order_channel not null,
  status public.order_status not null default 'pending',
  payment_status public.order_payment_status not null default 'unpaid',
  fulfilment_status public.fulfilment_status not null default 'unfulfilled',
  location_id uuid not null references public.locations (id),
  guest_name text,
  guest_phone text,
  guest_email text,
  bill_to_recipient text,
  bill_to_phone text,
  bill_to_address_line_1 text,
  bill_to_address_line_2 text,
  bill_to_city text,
  bill_to_region text,
  delivery_method_name text,
  delivery_fee numeric(14, 2) not null default 0,
  delivery_recipient text,
  delivery_phone text,
  delivery_address_line_1 text,
  delivery_address_line_2 text,
  delivery_city text,
  delivery_region text,
  subtotal numeric(14, 2) not null default 0,
  discount_total numeric(14, 2) not null default 0,
  taxable_amount numeric(14, 2) not null default 0,
  tax_amount numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2),
  total_amount numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete set null,
  quantity numeric(14, 3) not null,
  product_name text not null,
  variant_name text not null,
  sku text not null,
  options jsonb,
  unit_price numeric(14, 2) not null,
  unit_cost numeric(14, 2),
  discount_amount numeric(14, 2) not null default 0,
  line_total numeric(14, 2) not null,
  taxable_amount numeric(14, 2) not null default 0,
  tax_rate numeric(5, 2),
  tax_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_methods (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  fee numeric(14, 2),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  delivery_method_id uuid references public.delivery_methods (id),
  method_name text not null,
  status public.delivery_status not null default 'pending',
  carrier text,
  tracking_reference text,
  delivered_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger orders_set_updated_at
before update on public.orders
for each row execute function app.set_updated_at();

create trigger order_items_set_updated_at
before update on public.order_items
for each row execute function app.set_updated_at();

create trigger delivery_methods_set_updated_at
before update on public.delivery_methods
for each row execute function app.set_updated_at();

create trigger deliveries_set_updated_at
before update on public.deliveries
for each row execute function app.set_updated_at();