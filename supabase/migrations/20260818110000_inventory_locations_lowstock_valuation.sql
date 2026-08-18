-- Warehouses / Locations + Low Stock + Stock Valuation support.
--
-- No inventory balances, stock movements or catalogue data are touched. This
-- migration only:
--   1. Lets staff with inventory.read view locations (needed by the
--      Warehouses/Locations, Low Stock and Stock Valuation modules, which are
--      gated on inventory.read). Location insert/update/delete stays under
--      settings.manage as before.
--   2. Adds SECURITY INVOKER aggregate/RPC functions in the app schema so the
--      modules can aggregate server-side without PostgREST's 1,000-row cap,
--      following the established dashboard aggregation pattern. RLS still
--      applies to every read.
--
-- Definitions (mirroring the inventory modules):
--   available       = quantity_on_hand - reserved_quantity
--   out of stock    = available <= 0
--   low stock       = available > 0 AND reorder_level IS NOT NULL
--                     AND available <= reorder_level
--   affected        = out of stock OR low stock
--   shortage        = max(reorder_level - available, 0)
--   inventory value = quantity_on_hand * average_cost

-- ===========================================================================
-- 1. RLS: locations readable by inventory staff
-- ===========================================================================

create policy p_locations_inventory_select
on public.locations
for select to authenticated
using (app.has_permission('inventory.read'));

-- ===========================================================================
-- 2. Server-side aggregation functions
-- ===========================================================================

-- Per-location inventory summary used by the Warehouses/Locations list and
-- detail pages. Optional search matches location name or code.
create or replace function app.inventory_locations_summary(p_q text default null)
returns table (
  id uuid,
  name text,
  code text,
  location_type text,
  status text,
  region_name text,
  city text,
  address_line_1 text,
  address_line_2 text,
  phone text,
  sku_count bigint,
  units numeric,
  inventory_value numeric,
  low_stock_count bigint,
  out_of_stock_count bigint
)
language sql
stable
security invoker
as $$
  select
    l.id,
    l.name,
    l.code,
    l.location_type::text,
    l.status::text,
    r.name as region_name,
    l.city,
    l.address_line_1,
    l.address_line_2,
    l.phone,
    count(distinct ii.variant_id)::bigint as sku_count,
    round(coalesce(sum(ii.quantity_on_hand), 0)::numeric, 3) as units,
    round(coalesce(sum(ii.quantity_on_hand * ii.average_cost), 0)::numeric, 2) as inventory_value,
    count(ii.id) filter (
      where ii.reorder_level is not null
        and (ii.quantity_on_hand - ii.reserved_quantity) <= ii.reorder_level
    )::bigint as low_stock_count,
    count(ii.id) filter (
      where (ii.quantity_on_hand - ii.reserved_quantity) <= 0
    )::bigint as out_of_stock_count
  from public.locations l
  left join public.regions r on r.id = l.region_id
  left join public.inventory_items ii on ii.location_id = l.id
  where p_q is null or p_q = ''
    or l.name ilike '%' || p_q || '%'
    or l.code ilike '%' || p_q || '%'
  group by l.id, l.name, l.code, l.location_type, l.status, r.name,
    l.city, l.address_line_1, l.address_line_2, l.phone
  order by l.name asc, l.code asc;
$$;

-- Low Stock headline figures, optionally scoped to one location.
create or replace function app.inventory_low_stock_summary(p_location_id uuid default null)
returns table (
  out_of_stock_count bigint,
  low_stock_count bigint,
  affected_skus bigint,
  at_risk_value numeric
)
language sql
stable
security invoker
as $$
  select
    count(*) filter (
      where (quantity_on_hand - reserved_quantity) <= 0
    )::bigint as out_of_stock_count,
    count(*) filter (
      where (quantity_on_hand - reserved_quantity) > 0
        and reorder_level is not null
        and (quantity_on_hand - reserved_quantity) <= reorder_level
    )::bigint as low_stock_count,
    count(distinct variant_id) filter (
      where (quantity_on_hand - reserved_quantity) <= 0
        or (reorder_level is not null
            and (quantity_on_hand - reserved_quantity) <= reorder_level)
    )::bigint as affected_skus,
    round(coalesce(sum(quantity_on_hand * average_cost) filter (
      where (quantity_on_hand - reserved_quantity) <= 0
        or (reorder_level is not null
            and (quantity_on_hand - reserved_quantity) <= reorder_level)
    ), 0)::numeric, 2) as at_risk_value
  from public.inventory_items
  where p_location_id is null or location_id = p_location_id;
$$;

-- Paginated low-stock SKU list. All filtering, sorting and pagination happen
-- in PostgreSQL; returns { total, rows } as a single jsonb value.
create or replace function app.inventory_low_stock_skus(
  p_location_id uuid default null,
  p_q text default null,
  p_category_id uuid default null,
  p_status text default 'all',
  p_sort text default 'available',
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_total bigint;
  v_rows jsonb;
begin
  with recursive filtered as (
    select
      ii.id,
      pv.product_id,
      pr.name as product_name,
      pv.name as variant_name,
      pv.sku,
      pv.barcode,
      ii.location_id,
      l.name as location_name,
      ii.quantity_on_hand,
      ii.reserved_quantity,
      (ii.quantity_on_hand - ii.reserved_quantity) as available,
      ii.reorder_level,
      ii.average_cost,
      round((ii.quantity_on_hand * coalesce(ii.average_cost, 0))::numeric, 2) as inventory_value,
      coalesce(greatest(coalesce(ii.reorder_level, 0) - (ii.quantity_on_hand - ii.reserved_quantity), 0), 0) as shortage
    from public.inventory_items ii
    join public.product_variants pv on pv.id = ii.variant_id
    join public.products pr on pr.id = pv.product_id
    join public.locations l on l.id = ii.location_id
    where (p_location_id is null or ii.location_id = p_location_id)
      and (p_category_id is null or pr.category_id = p_category_id)
      and (p_q is null or p_q = ''
        or pr.name ilike '%' || p_q || '%'
        or pv.name ilike '%' || p_q || '%'
        or pv.sku ilike '%' || p_q || '%'
        or coalesce(pv.barcode, '') ilike '%' || p_q || '%')
      and (
        (ii.quantity_on_hand - ii.reserved_quantity) <= 0
        or (ii.reorder_level is not null
            and (ii.quantity_on_hand - ii.reserved_quantity) <= ii.reorder_level)
      )
      and (
        p_status = 'all'
        or (p_status = 'out' and (ii.quantity_on_hand - ii.reserved_quantity) <= 0)
        or (p_status = 'low'
            and (ii.quantity_on_hand - ii.reserved_quantity) > 0
            and ii.reorder_level is not null
            and (ii.quantity_on_hand - ii.reserved_quantity) <= ii.reorder_level)
      )
  ),
  counted as (
    select count(*) as total from filtered
  ),
  paged as (
    select *
    from filtered
    order by
      case when p_sort = 'available' then available end asc nulls last,
      case when p_sort = 'shortage' then shortage end desc nulls last,
      case when p_sort = 'value' then inventory_value end desc nulls last,
      case when p_sort = 'name' then product_name end asc nulls last,
      available asc,
      variant_name asc
    limit greatest(p_page_size, 0)
    offset greatest(p_page - 1, 0) * greatest(p_page_size, 0)
  )
  select into v_total, v_rows
    c.total,
    coalesce(jsonb_agg(to_jsonb(paged)), '[]'::jsonb)
  from counted c, paged;

  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;

-- Stock Valuation headline figures plus by-location and by-category
-- breakdowns, optionally scoped to one location or category.
create or replace function app.inventory_valuation_summary(
  p_location_id uuid default null,
  p_category_id uuid default null
)
returns jsonb
language sql
stable
security invoker
as $$
  with recursive filtered as (
    select
      ii.id,
      ii.location_id,
      ii.variant_id,
      ii.quantity_on_hand,
      ii.reserved_quantity,
      ii.average_cost,
      ii.reorder_level,
      pr.category_id
    from public.inventory_items ii
    join public.product_variants pv on pv.id = ii.variant_id
    join public.products pr on pr.id = pv.product_id
    where (p_location_id is null or ii.location_id = p_location_id)
      and (p_category_id is null or pr.category_id = p_category_id)
  ),
  cat_paths as (
    select id, parent_id, id as root_id, name as root_name
    from public.categories
    where parent_id is null
    union all
    select c.id, c.parent_id, p.root_id, p.root_name
    from public.categories c
    join cat_paths p on c.parent_id = p.id
  ),
  totals as (
    select
      round(coalesce(sum(quantity_on_hand * average_cost), 0)::numeric, 2) as total_value,
      round(coalesce(sum(quantity_on_hand), 0)::numeric, 3) as total_units,
      count(distinct variant_id)::bigint as sku_count,
      count(distinct location_id)::bigint as location_count,
      round(coalesce(sum(quantity_on_hand * average_cost) filter (
        where (quantity_on_hand - reserved_quantity) <= 0
          or (reorder_level is not null
              and (quantity_on_hand - reserved_quantity) <= reorder_level)
      ), 0)::numeric, 2) as low_stock_value
    from filtered
  ),
  by_location as (
    select
      l.id as location_id,
      l.name as location_name,
      round(coalesce(sum(f.quantity_on_hand * f.average_cost), 0)::numeric, 2) as value,
      round(coalesce(sum(f.quantity_on_hand), 0)::numeric, 3) as units,
      count(*)::bigint as item_count
    from filtered f
    join public.locations l on l.id = f.location_id
    group by l.id, l.name
    order by value desc
  ),
  by_category as (
    select
      coalesce(cp.root_name, 'Uncategorised') as category_name,
      round(coalesce(sum(f.quantity_on_hand * f.average_cost), 0)::numeric, 2) as value,
      round(coalesce(sum(f.quantity_on_hand), 0)::numeric, 3) as units,
      count(*)::bigint as item_count
    from filtered f
    left join cat_paths cp on cp.id = f.category_id
    group by coalesce(cp.root_name, 'Uncategorised')
    order by value desc
  )
  select jsonb_build_object(
    'total_value', (select total_value from totals),
    'total_units', (select total_units from totals),
    'sku_count', (select sku_count from totals),
    'location_count', (select location_count from totals),
    'low_stock_value', (select low_stock_value from totals),
    'by_location', coalesce((
      select jsonb_agg(to_jsonb(bl) order by bl.value desc)
      from by_location bl
    ), '[]'::jsonb),
    'by_category', coalesce((
      select jsonb_agg(to_jsonb(bc) order by bc.value desc)
      from by_category bc
    ), '[]'::jsonb)
  );
$$;

-- Paginated Stock Valuation table. All filtering, sorting and pagination
-- happen in PostgreSQL; returns { total, rows } as a single jsonb value.
create or replace function app.inventory_valuation_rows(
  p_location_id uuid default null,
  p_category_id uuid default null,
  p_product_id uuid default null,
  p_q text default null,
  p_status text default 'all',
  p_sort text default 'name',
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language plpgsql
stable
security invoker
as $$
declare
  v_total bigint;
  v_rows jsonb;
begin
  with recursive filtered as (
    select
      ii.id,
      pv.product_id,
      pr.name as product_name,
      pv.name as variant_name,
      pv.sku,
      pv.barcode,
      ii.location_id,
      l.name as location_name,
      ii.quantity_on_hand,
      ii.reserved_quantity,
      (ii.quantity_on_hand - ii.reserved_quantity) as available,
      ii.reorder_level,
      ii.average_cost,
      round((ii.quantity_on_hand * coalesce(ii.average_cost, 0))::numeric, 2) as inventory_value
    from public.inventory_items ii
    join public.product_variants pv on pv.id = ii.variant_id
    join public.products pr on pr.id = pv.product_id
    join public.locations l on l.id = ii.location_id
    where (p_location_id is null or ii.location_id = p_location_id)
      and (p_category_id is null or pr.category_id = p_category_id)
      and (p_product_id is null or pv.product_id = p_product_id)
      and (p_q is null or p_q = ''
        or pr.name ilike '%' || p_q || '%'
        or pv.name ilike '%' || p_q || '%'
        or pv.sku ilike '%' || p_q || '%'
        or coalesce(pv.barcode, '') ilike '%' || p_q || '%')
      and (
        p_status = 'all'
        or (p_status = 'out' and (ii.quantity_on_hand - ii.reserved_quantity) <= 0)
        or (p_status = 'low'
            and (ii.quantity_on_hand - ii.reserved_quantity) > 0
            and ii.reorder_level is not null
            and (ii.quantity_on_hand - ii.reserved_quantity) <= ii.reorder_level)
      )
  ),
  counted as (
    select count(*) as total from filtered
  ),
  paged as (
    select *
    from filtered
    order by
      case p_sort when 'value' then inventory_value when 'units' then quantity_on_hand end desc nulls last,
      product_name asc nulls last,
      variant_name asc
    limit greatest(p_page_size, 0)
    offset greatest(p_page - 1, 0) * greatest(p_page_size, 0)
  )
  select into v_total, v_rows
    c.total,
    coalesce(jsonb_agg(to_jsonb(paged)), '[]'::jsonb)
  from counted c, paged;

  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;

-- ===========================================================================
-- 3. Function grants
-- ===========================================================================

revoke execute on function app.inventory_locations_summary(text) from public;
revoke execute on function app.inventory_low_stock_summary(uuid) from public;
revoke execute on function app.inventory_low_stock_skus(uuid, text, uuid, text, text, integer, integer) from public;
revoke execute on function app.inventory_valuation_summary(uuid, uuid) from public;
revoke execute on function app.inventory_valuation_rows(uuid, uuid, uuid, text, text, text, integer, integer) from public;

grant execute on function app.inventory_locations_summary(text) to authenticated, service_role;
grant execute on function app.inventory_low_stock_summary(uuid) to authenticated, service_role;
grant execute on function app.inventory_low_stock_skus(uuid, text, uuid, text, text, integer, integer) to authenticated, service_role;
grant execute on function app.inventory_valuation_summary(uuid, uuid) to authenticated, service_role;
grant execute on function app.inventory_valuation_rows(uuid, uuid, uuid, text, text, text, integer, integer) to authenticated, service_role;