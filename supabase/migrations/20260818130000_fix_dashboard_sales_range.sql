-- Fix dashboard_sales_range aggregation.
--
-- The previous implementation joined public.orders with public.order_items
-- and then aggregated over the joined rows: count(*) counted order lines
-- instead of orders, and sum(o.total_amount) multiplied each order's value
-- by its number of lines. With historical data loaded this inflated
-- order_count and revenue (e.g. a 9-order day reported 18 orders and
-- 3x the revenue).
--
-- The corrected version keeps the per-order aggregates in a LATERAL subquery
-- (one row per order), matching the pattern already used by
-- dashboard_sales_by_day / dashboard_sales_by_month.

set search_path = public, extensions;

create or replace function app.dashboard_sales_range(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  revenue numeric,
  cogs numeric,
  gross_profit numeric,
  gross_margin numeric,
  order_count bigint,
  units_sold numeric,
  average_order_value numeric,
  cancelled_orders bigint
)
language sql
stable
security invoker
as $$
  with ord as (
    select o.id, o.total_amount
    from public.orders o
    where o.created_at >= p_start
      and o.created_at <= p_end
      and o.status <> 'cancelled'
  ),
  sales as (
    select
      coalesce(sum(o.total_amount), 0)::numeric as revenue,
      count(*)::bigint as order_count,
      coalesce(sum(oi.units), 0)::numeric as units_sold,
      coalesce(sum(oi.cost), 0)::numeric as cogs
    from ord o
    left join lateral (
      select
        coalesce(sum(oi.quantity), 0)::numeric as units,
        coalesce(sum(oi.quantity * oi.unit_cost), 0)::numeric as cost
      from public.order_items oi
      where oi.order_id = o.id
    ) oi on true
  ),
  cancelled as (
    select count(*)::bigint as cancelled_orders
    from public.orders o
    where o.created_at >= p_start
      and o.created_at <= p_end
      and o.status = 'cancelled'
  )
  select
    s.revenue,
    round(s.cogs, 2) as cogs,
    round(s.revenue - s.cogs, 2) as gross_profit,
    case when s.revenue > 0
      then round(((s.revenue - s.cogs) / s.revenue * 100)::numeric, 2)
      else 0 end as gross_margin,
    s.order_count,
    round(s.units_sold, 3) as units_sold,
    case when s.order_count > 0
      then round((s.revenue / s.order_count)::numeric, 2)
      else 0 end as average_order_value,
    c.cancelled_orders
  from sales s, cancelled c;
$$;

grant execute on function app.dashboard_sales_range(timestamptz, timestamptz)
  to authenticated, service_role;
