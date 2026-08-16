create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references public.locations (id),
  variant_id uuid not null references public.product_variants (id),
  quantity_on_hand numeric(14, 3) not null default 0,
  reserved_quantity numeric(14, 3) not null default 0,
  average_cost numeric(14, 2) not null default 0,
  reorder_level numeric(14, 3),
  reorder_quantity numeric(14, 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_items_location_variant_unique unique (location_id, variant_id)
);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items (id),
  movement_type public.movement_type not null,
  quantity_change numeric(14, 3) not null,
  unit_cost numeric(14, 2),
  source_type text not null,
  source_id uuid not null,
  note text,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.stock_transfers (
  id uuid primary key default gen_random_uuid(),
  transfer_number text not null unique,
  from_location_id uuid not null references public.locations (id),
  to_location_id uuid not null references public.locations (id),
  status public.transfer_status not null default 'draft',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.stock_transfer_items (
  id uuid primary key default gen_random_uuid(),
  transfer_id uuid not null references public.stock_transfers (id) on delete cascade,
  variant_id uuid not null references public.product_variants (id),
  quantity numeric(14, 3) not null,
  status public.transfer_item_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  adjustment_number text not null unique,
  reason text not null,
  status public.adjustment_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id)
);

create table public.stock_adjustment_items (
  id uuid primary key default gen_random_uuid(),
  adjustment_id uuid not null references public.stock_adjustments (id) on delete cascade,
  inventory_item_id uuid not null references public.inventory_items (id),
  reason text not null,
  quantity_change numeric(14, 3) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row execute function app.set_updated_at();

create trigger stock_transfers_set_updated_at
before update on public.stock_transfers
for each row execute function app.set_updated_at();

create trigger stock_transfer_items_set_updated_at
before update on public.stock_transfer_items
for each row execute function app.set_updated_at();

create trigger stock_adjustments_set_updated_at
before update on public.stock_adjustments
for each row execute function app.set_updated_at();

create trigger stock_adjustment_items_set_updated_at
before update on public.stock_adjustment_items
for each row execute function app.set_updated_at();