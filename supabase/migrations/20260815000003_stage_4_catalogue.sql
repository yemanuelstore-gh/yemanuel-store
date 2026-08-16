create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  parent_id uuid references public.categories (id),
  description text,
  image_url text,
  sort_order integer not null default 0,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  brand_id uuid references public.brands (id),
  name text not null,
  slug text not null unique,
  description text,
  status public.product_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  sku text not null unique,
  barcode text unique,
  options jsonb,
  status public.entity_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  url text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index product_images_one_primary_per_product on public.product_images (product_id) where is_primary;

create table public.prices (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products (id) on delete cascade,
  variant_id uuid references public.product_variants (id) on delete cascade,
  price_type public.price_type not null,
  amount numeric(14, 2) not null,
  location_id uuid references public.locations (id),
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references auth.users (id),
  constraint prices_exactly_one_target_check check (num_nonnulls(product_id, variant_id) = 1)
);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  key text not null,
  value text not null,
  description text,
  location_id uuid references public.locations (id),
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id)
);

create unique index settings_key_system_unique on public.settings (key) where location_id is null;
create unique index settings_key_location_unique on public.settings (key, location_id) where location_id is not null;

create trigger categories_set_updated_at
before update on public.categories
for each row execute function app.set_updated_at();

create trigger brands_set_updated_at
before update on public.brands
for each row execute function app.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function app.set_updated_at();

create trigger product_variants_set_updated_at
before update on public.product_variants
for each row execute function app.set_updated_at();

create trigger product_images_set_updated_at
before update on public.product_images
for each row execute function app.set_updated_at();

create trigger settings_set_updated_at
before update on public.settings
for each row execute function app.set_updated_at();