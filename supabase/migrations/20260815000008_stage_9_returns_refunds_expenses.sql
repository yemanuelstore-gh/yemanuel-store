create table public.returns (
  id uuid primary key default gen_random_uuid(),
  return_number text not null unique,
  order_id uuid not null references public.orders (id),
  customer_id uuid references public.customers (id),
  status public.return_status not null default 'pending',
  reason public.return_reason not null,
  reason_note text,
  created_by uuid references public.staff (id),
  approved_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.returns (id) on delete cascade,
  order_item_id uuid not null references public.order_items (id),
  variant_id uuid not null references public.product_variants (id),
  quantity_returned numeric(14, 3) not null,
  condition public.item_condition not null,
  refund_amount numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.refunds (
  id uuid primary key default gen_random_uuid(),
  refund_number text not null unique,
  order_id uuid not null references public.orders (id),
  payment_id uuid references public.payments (id),
  return_id uuid references public.returns (id),
  amount numeric(14, 2) not null,
  method public.payment_method not null,
  status public.refund_status not null default 'pending',
  reference text,
  reason text,
  processed_by uuid references public.staff (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_number text not null unique,
  category_id uuid not null references public.expense_categories (id),
  description text not null,
  amount numeric(14, 2) not null,
  expense_date date not null,
  method public.payment_method not null,
  reference_number text,
  supplier_id uuid references public.suppliers (id),
  location_id uuid references public.locations (id),
  attachment_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create trigger returns_set_updated_at
before update on public.returns
for each row execute function app.set_updated_at();

create trigger return_items_set_updated_at
before update on public.return_items
for each row execute function app.set_updated_at();

create trigger refunds_set_updated_at
before update on public.refunds
for each row execute function app.set_updated_at();

create trigger expense_categories_set_updated_at
before update on public.expense_categories
for each row execute function app.set_updated_at();

create trigger expenses_set_updated_at
before update on public.expenses
for each row execute function app.set_updated_at();