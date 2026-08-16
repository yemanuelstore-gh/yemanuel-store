-- Stage 15: catalogue performance indexes.
--
-- The stage 14 catalogue grew the storefront tables ~4x (3,173 products,
-- 6,674 variants, 3,173 images, 7,619 prices). The FK columns used by the
-- storefront's embedded PostgREST queries had no supporting indexes, so the
-- lateral lookups degraded into repeated sequential scans that exceeded the
-- pooler statement timeout and made the storefront fail.
--
-- These indexes are purely additive: no data, policy or constraint changes.

set search_path = public, extensions;

create index if not exists product_variants_product_id_idx
  on public.product_variants (product_id);

create index if not exists product_images_product_id_idx
  on public.product_images (product_id);

create index if not exists prices_product_id_idx
  on public.prices (product_id);

create index if not exists prices_variant_id_idx
  on public.prices (variant_id);

create index if not exists inventory_items_variant_id_idx
  on public.inventory_items (variant_id);

create index if not exists products_category_id_idx
  on public.products (category_id);

create index if not exists products_brand_id_idx
  on public.products (brand_id);

create index if not exists products_status_created_at_idx
  on public.products (status, created_at desc);