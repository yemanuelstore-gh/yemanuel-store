-- Dashboard aggregation functions.
--
-- Every dashboard query aggregates server-side (in PostgreSQL) instead of
-- shipping raw rows to the application. This removes the PostgREST 1,000-row
-- default row cap that previously truncated inventory and movement data, and
-- keeps the ERP dashboard fast even with tens of thousands of rows.
--
-- All functions are SECURITY INVOKER: they execute as the calling (staff)
-- role and are therefore subject to the same RLS policies as direct reads,
-- including app.has_permission checks per module.
--
-- Date conventions (mirroring src/lib/business-calendar.ts and migration
-- 20260817020000_business_calendar.sql):
--   - Business start: Monday 17 January 2022 (app.business_start_date()).
--   - Operating days: Monday through Saturday (app.is_business_day()).
--   - Sunday: closed.
--   - Ghana is UTC+0 with no DST; day bucketing is performed in UTC.

-- ===========================================================================
-- SALES
-- ===========================================================================

-- Order totals for a range. Revenue is the invoice total of non-cancelled
-- orders; COGS comes from order item unit costs (when known); gross profit is
-- revenue minus COGS.
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
      coalesce(sum(oi.quantity), 0)::numeric as units_sold,
      coalesce(sum(oi.quantity * oi.unit_cost), 0)::numeric as cogs
    from ord o
    left join public.order_items oi on oi.order_id = o.id
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

-- Daily sales series (UTC days) for the daily sales trend chart.
create or replace function app.dashboard_sales_by_day(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  day date,
  revenue numeric,
  gross_profit numeric,
  order_count bigint
)
language sql
stable
security invoker
as $$
  with ord as (
    select o.id, o.created_at, o.total_amount
    from public.orders o
    where o.created_at >= p_start
      and o.created_at <= p_end
      and o.status <> 'cancelled'
  )
  select
    (date_trunc('day', o.created_at at time zone 'UTC'))::date as day,
    round(coalesce(sum(o.total_amount), 0)::numeric, 2) as revenue,
    round(coalesce(sum(o.total_amount - oi.cost), 0)::numeric, 2) as gross_profit,
    count(*)::bigint as order_count
  from ord o
  left join lateral (
    select sum(oi.quantity * oi.unit_cost) as cost
    from public.order_items oi
    where oi.order_id = o.id
  ) oi on true
  group by 1
  order by 1;
$$;

-- Monthly sales series for the monthly sales trend chart.
create or replace function app.dashboard_sales_by_month(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  month date,
  revenue numeric,
  gross_profit numeric,
  order_count bigint
)
language sql
stable
security invoker
as $$
  with ord as (
    select o.id, o.created_at, o.total_amount
    from public.orders o
    where o.created_at >= p_start
      and o.created_at <= p_end
      and o.status <> 'cancelled'
  )
  select
    (date_trunc('month', o.created_at at time zone 'UTC'))::date as month,
    round(coalesce(sum(o.total_amount), 0)::numeric, 2) as revenue,
    round(coalesce(sum(o.total_amount - oi.cost), 0)::numeric, 2) as gross_profit,
    count(*)::bigint as order_count
  from ord o
  left join lateral (
    select sum(oi.quantity * oi.unit_cost) as cost
    from public.order_items oi
    where oi.order_id = o.id
  ) oi on true
  group by 1
  order by 1;
$$;

-- Sales grouped by top-level (root) category, e.g. Fashion, Electronics.
create or replace function app.dashboard_sales_by_category(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  category_name text,
  revenue numeric,
  units numeric,
  order_count bigint
)
language sql
stable
security invoker
as $$
  with recursive cat_paths as (
    select id, parent_id, id as root_id, name as root_name
    from public.categories
    where parent_id is null
    union all
    select c.id, c.parent_id, p.root_id, p.root_name
    from public.categories c
    join cat_paths p on c.parent_id = p.id
  )
  select
    coalesce(cp.root_name, 'Uncategorised') as category_name,
    round(coalesce(sum(oi.line_total), 0)::numeric, 2) as revenue,
    round(coalesce(sum(oi.quantity), 0)::numeric, 3) as units,
    count(distinct o.id)::bigint as order_count
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
    and o.status <> 'cancelled'
    and o.created_at >= p_start
    and o.created_at <= p_end
  left join public.product_variants pv on pv.id = oi.variant_id
  left join public.products pr on pr.id = pv.product_id
  left join cat_paths cp on cp.id = pr.category_id
  group by coalesce(cp.root_name, 'Uncategorised')
  order by revenue desc;
$$;

-- Top-selling products (by revenue) within a range.
create or replace function app.dashboard_top_products(
  p_start timestamptz,
  p_end timestamptz,
  p_limit integer default 10
)
returns table (
  variant_name text,
  product_name text,
  sku text,
  units numeric,
  revenue numeric
)
language sql
stable
security invoker
as $$
  select
    oi.variant_name,
    oi.product_name,
    oi.sku,
    round(sum(oi.quantity)::numeric, 3) as units,
    round(sum(oi.line_total)::numeric, 2) as revenue
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
    and o.status <> 'cancelled'
    and o.created_at >= p_start
    and o.created_at <= p_end
  group by oi.variant_id, oi.variant_name, oi.product_name, oi.sku
  order by revenue desc
  limit p_limit;
$$;

-- ===========================================================================
-- PAYMENTS
-- ===========================================================================

-- Payment collections grouped by method (paid/authorized only).
create or replace function app.dashboard_payment_breakdown(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  method text,
  collected numeric,
  payment_count bigint
)
language sql
stable
security invoker
as $$
  select
    p.method::text as method,
    round(coalesce(sum(p.amount), 0)::numeric, 2) as collected,
    count(*)::bigint as payment_count
  from public.payments p
  where p.payment_date >= p_start
    and p.payment_date <= p_end
    and p.status in ('paid', 'authorized')
  group by p.method
  order by collected desc;
$$;

-- Collections, pending payments and refunds for a range.
create or replace function app.dashboard_payments_range(
  p_start timestamptz,
  p_end timestamptz
)
returns table (
  collected_total numeric,
  collected_count bigint,
  pending_count bigint,
  pending_amount numeric,
  refunds_total numeric,
  refunds_count bigint
)
language sql
stable
security invoker
as $$
  with collected as (
    select
      coalesce(sum(amount), 0)::numeric as total,
      count(*)::bigint as cnt
    from public.payments
    where payment_date >= p_start
      and payment_date <= p_end
      and status in ('paid', 'authorized')
  ),
  pending as (
    select
      coalesce(sum(amount), 0)::numeric as total,
      count(*)::bigint as cnt
    from public.payments
    where payment_date >= p_start
      and payment_date <= p_end
      and status = 'pending'
  ),
  refunded as (
    select
      coalesce(sum(amount), 0)::numeric as total,
      count(*)::bigint as cnt
    from public.refunds
    where created_at >= p_start
      and created_at <= p_end
      and status not in ('cancelled', 'failed')
  )
  select
    c.total, c.cnt,
    p.total as pending_amount, p.cnt as pending_count,
    r.total as refunds_total, r.cnt as refunds_count
  from collected c, pending p, refunded r;
$$;

-- Outstanding customer receivables (orders with an unpaid balance).
create or replace function app.dashboard_receivables()
returns table (
  customer_name text,
  order_count bigint,
  outstanding numeric
)
language sql
stable
security invoker
as $$
  with balances as (
    select
      o.id,
      o.customer_id,
      o.guest_name,
      o.total_amount,
      coalesce(
        (select sum(p.amount)
         from public.payments p
         where p.order_id = o.id
           and p.status in ('paid', 'authorized')),
        0
      ) as paid
    from public.orders o
    where o.status <> 'cancelled'
      and o.payment_status in ('unpaid', 'partially_paid')
  )
  select
    coalesce(c.first_name || ' ' || c.last_name, b.guest_name, 'Guest') as customer_name,
    count(*)::bigint as order_count,
    round(coalesce(sum(b.total_amount - b.paid), 0)::numeric, 2) as outstanding
  from balances b
  left join public.customers c on c.id = b.customer_id
  group by coalesce(c.first_name || ' ' || c.last_name, b.guest_name, 'Guest')
  order by outstanding desc;
$$;

-- ===========================================================================
-- INVENTORY
-- ===========================================================================

-- Whole-inventory aggregation. This is the single source of truth for the
-- dashboard's inventory KPIs and is not subject to any row cap.
create or replace function app.dashboard_inventory_summary()
returns table (
  total_value numeric,
  total_units numeric,
  item_count bigint,
  sku_count bigint,
  low_stock_count bigint,
  out_of_stock_count bigint
)
language sql
stable
security invoker
as $$
  select
    round(coalesce(sum(quantity_on_hand * average_cost), 0)::numeric, 2) as total_value,
    round(coalesce(sum(quantity_on_hand), 0)::numeric, 3) as total_units,
    count(*)::bigint as item_count,
    count(distinct variant_id)::bigint as sku_count,
    count(*) filter (
      where reorder_level is not null and quantity_on_hand <= reorder_level
    )::bigint as low_stock_count,
    count(*) filter (where quantity_on_hand <= 0)::bigint as out_of_stock_count
  from public.inventory_items;
$$;

-- Inventory value grouped by top-level category.
create or replace function app.dashboard_inventory_by_category()
returns table (
  category_name text,
  value numeric,
  units numeric,
  item_count bigint
)
language sql
stable
security invoker
as $$
  with recursive cat_paths as (
    select id, parent_id, id as root_id, name as root_name
    from public.categories
    where parent_id is null
    union all
    select c.id, c.parent_id, p.root_id, p.root_name
    from public.categories c
    join cat_paths p on c.parent_id = p.id
  )
  select
    coalesce(cp.root_name, 'Uncategorised') as category_name,
    round(coalesce(sum(ii.quantity_on_hand * ii.average_cost), 0)::numeric, 2) as value,
    round(coalesce(sum(ii.quantity_on_hand), 0)::numeric, 3) as units,
    count(*)::bigint as item_count
  from public.inventory_items ii
  left join public.product_variants pv on pv.id = ii.variant_id
  left join public.products pr on pr.id = pv.product_id
  left join cat_paths cp on cp.id = pr.category_id
  group by coalesce(cp.root_name, 'Uncategorised')
  order by value desc;
$$;

-- Inventory valuation trend over the last p_days, reconstructed from the
-- append-only stock ledger: today's value minus net movement value after each
-- day. Days before the business start date are omitted.
create or replace function app.dashboard_inventory_trend(
  p_days integer default 30
)
returns table (
  day date,
  value numeric,
  net_movement numeric
)
language sql
stable
security invoker
as $$
  with current_value as (
    select coalesce(sum(quantity_on_hand * average_cost), 0)::numeric as cv
    from public.inventory_items
  ),
  daily as (
    select
      (date_trunc('day', created_at at time zone 'UTC'))::date as day,
      round(coalesce(sum(unit_cost * quantity_change), 0)::numeric, 2) as net
    from public.stock_movements
    group by 1
  ),
  series as (
    select ((now() at time zone 'UTC')::date - gs)::date as day
    from generate_series(0, greatest(p_days - 1, 0)) as gs
  )
  select
    s.day,
    round(
      greatest(cv - coalesce((
        select sum(d.net) from daily d where d.day > s.day
      ), 0), 0)::numeric,
      2
    ) as value,
    coalesce(d.net, 0) as net_movement
  from series s
  cross join current_value
  left join daily d on d.day = s.day
  where s.day >= (select app.business_start_date() at time zone 'UTC')::date
  order by s.day;
$$;

-- ===========================================================================
-- PURCHASING
-- ===========================================================================

-- Purchase activity within a range. "Value" is the landed value of goods
-- actually received (goods receipts), which is what hit the store.
create or replace function app.dashboard_purchases_range(
  p_start date,
  p_end date
)
returns table (
  receipts_value numeric,
  receipt_count bigint,
  po_count bigint,
  invoice_count bigint,
  invoices_value numeric
)
language sql
stable
security invoker
as $$
  with receipts as (
    select
      coalesce(sum(gri.unit_cost_actual * gri.quantity_received), 0)::numeric as value,
      count(distinct gr.id)::bigint as cnt
    from public.goods_receipt_items gri
    join public.goods_receipts gr on gr.id = gri.goods_receipt_id
      and gr.received_date >= p_start
      and gr.received_date <= p_end
      and gr.status <> 'cancelled'
  ),
  pos as (
    select count(*)::bigint as cnt
    from public.purchase_orders
    where created_at >= (p_start::timestamptz)
      and created_at <= (p_end::timestamptz + interval '1 day - 1 microsecond')
      and status <> 'cancelled'
  ),
  invoices as (
    select
      coalesce(sum(amount), 0)::numeric as value,
      count(*)::bigint as cnt
    from public.supplier_invoices
    where invoice_date >= p_start
      and invoice_date <= p_end
      and status <> 'cancelled'
  )
  select r.value, r.cnt, p.cnt, i.cnt, i.value
  from receipts r, pos p, invoices i;
$$;

-- Monthly goods receipt value for the purchase trend chart.
create or replace function app.dashboard_purchases_by_month(
  p_start date,
  p_end date
)
returns table (
  month date,
  receipts_value numeric,
  receipt_count bigint
)
language sql
stable
security invoker
as $$
  select
    (date_trunc('month', gr.received_date))::date as month,
    round(coalesce(sum(gri.unit_cost_actual * gri.quantity_received), 0)::numeric, 2) as receipts_value,
    count(distinct gr.id)::bigint as receipt_count
  from public.goods_receipt_items gri
  join public.goods_receipts gr on gr.id = gri.goods_receipt_id
    and gr.received_date >= p_start
    and gr.received_date <= p_end
    and gr.status <> 'cancelled'
  group by 1
  order by 1;
$$;

-- Top suppliers by received value within a range.
create or replace function app.dashboard_top_suppliers(
  p_start date,
  p_end date,
  p_limit integer default 10
)
returns table (
  supplier_name text,
  receipts_value numeric,
  receipt_count bigint
)
language sql
stable
security invoker
as $$
  select
    coalesce(s.name, po.po_number, 'Unknown supplier') as supplier_name,
    round(coalesce(sum(gri.unit_cost_actual * gri.quantity_received), 0)::numeric, 2) as receipts_value,
    count(distinct gr.id)::bigint as receipt_count
  from public.goods_receipt_items gri
  join public.goods_receipts gr on gr.id = gri.goods_receipt_id
    and gr.received_date >= p_start
    and gr.received_date <= p_end
    and gr.status <> 'cancelled'
  left join public.purchase_orders po on po.id = gr.purchase_order_id
  left join public.suppliers s on s.id = po.supplier_id
  group by coalesce(s.name, po.po_number, 'Unknown supplier')
  order by receipts_value desc
  limit p_limit;
$$;

-- Outstanding supplier payables.
create or replace function app.dashboard_payables()
returns table (
  supplier_name text,
  invoice_count bigint,
  outstanding numeric
)
language sql
stable
security invoker
as $$
  select
    coalesce(s.name, 'Unknown supplier') as supplier_name,
    count(*)::bigint as invoice_count,
    round(coalesce(sum(i.amount - paid.paid), 0)::numeric, 2) as outstanding
  from public.supplier_invoices i
  left join public.suppliers s on s.id = i.supplier_id
  left join lateral (
    select coalesce(sum(pp.amount), 0)::numeric as paid
    from public.purchase_payments pp
    where pp.invoice_id = i.id
  ) paid on true
  where i.status in ('pending', 'partially_paid')
  group by coalesce(s.name, 'Unknown supplier')
  order by outstanding desc;
$$;

-- ===========================================================================
-- EXPENSES
-- ===========================================================================

create or replace function app.dashboard_expenses_range(
  p_start date,
  p_end date
)
returns table (
  total numeric,
  expense_count bigint
)
language sql
stable
security invoker
as $$
  select
    round(coalesce(sum(amount), 0)::numeric, 2) as total,
    count(*)::bigint as expense_count
  from public.expenses
  where expense_date >= p_start
    and expense_date <= p_end;
$$;

create or replace function app.dashboard_expenses_by_category(
  p_start date,
  p_end date
)
returns table (
  category_name text,
  total numeric,
  expense_count bigint
)
language sql
stable
security invoker
as $$
  select
    coalesce(ec.name, 'Uncategorised') as category_name,
    round(coalesce(sum(e.amount), 0)::numeric, 2) as total,
    count(*)::bigint as expense_count
  from public.expenses e
  left join public.expense_categories ec on ec.id = e.category_id
  where e.expense_date >= p_start
    and e.expense_date <= p_end
  group by coalesce(ec.name, 'Uncategorised')
  order by total desc;
$$;

create or replace function app.dashboard_expenses_by_month(
  p_start date,
  p_end date
)
returns table (
  month date,
  total numeric,
  expense_count bigint
)
language sql
stable
security invoker
as $$
  select
    (date_trunc('month', e.expense_date))::date as month,
    round(coalesce(sum(e.amount), 0)::numeric, 2) as total,
    count(*)::bigint as expense_count
  from public.expenses e
  where e.expense_date >= p_start
    and e.expense_date <= p_end
  group by 1
  order by 1;
$$;

-- ===========================================================================
-- CUSTOMERS
-- ===========================================================================

create or replace function app.dashboard_customers_summary(
  p_month_start timestamptz,
  p_year_start timestamptz
)
returns table (
  total_customers bigint,
  new_this_month bigint,
  new_this_year bigint,
  repeat_customers bigint,
  total_orders bigint,
  orders_per_customer numeric
)
language sql
stable
security invoker
as $$
  with totals as (
    select count(*)::bigint as total_customers
    from public.customers
  ),
  new_counts as (
    select
      count(*) filter (where created_at >= p_month_start)::bigint as new_this_month,
      count(*) filter (where created_at >= p_year_start)::bigint as new_this_year
    from public.customers
  ),
  repeats as (
    select count(*)::bigint as repeat_customers
    from (
      select o.customer_id
      from public.orders o
      where o.customer_id is not null
        and o.status <> 'cancelled'
      group by o.customer_id
      having count(*) >= 2
    ) r
  ),
  orders as (
    select count(*)::bigint as total_orders
    from public.orders
    where status <> 'cancelled'
  )
  select
    t.total_customers,
    n.new_this_month,
    n.new_this_year,
    r.repeat_customers,
    o.total_orders,
    case when t.total_customers > 0
      then round((o.total_orders::numeric / t.total_customers), 2)
      else 0 end as orders_per_customer
  from totals t, new_counts n, repeats r, orders o;
$$;

create or replace function app.dashboard_top_customers(
  p_start timestamptz,
  p_end timestamptz,
  p_limit integer default 10
)
returns table (
  customer_name text,
  order_count bigint,
  spending numeric
)
language sql
stable
security invoker
as $$
  select
    coalesce(
      c.first_name || ' ' || c.last_name,
      o.guest_name,
      'Guest'
    ) as customer_name,
    count(*)::bigint as order_count,
    round(coalesce(sum(o.total_amount), 0)::numeric, 2) as spending
  from public.orders o
  left join public.customers c on c.id = o.customer_id
  where o.status <> 'cancelled'
    and o.created_at >= p_start
    and o.created_at <= p_end
  group by coalesce(c.first_name || ' ' || c.last_name, o.guest_name, 'Guest')
  order by spending desc
  limit p_limit;
$$;

-- ===========================================================================
-- ALERTS (current position, independent of the selected date range)
-- ===========================================================================

create or replace function app.dashboard_alerts()
returns table (
  pending_payment_count bigint,
  pending_payment_amount numeric,
  unfulfilled_order_count bigint,
  open_po_count bigint
)
language sql
stable
security invoker
as $$
  with pending as (
    select
      coalesce(sum(amount), 0)::numeric as amount,
      count(*)::bigint as cnt
    from public.payments
    where status = 'pending'
  ),
  unfulfilled as (
    select count(*)::bigint as cnt
    from public.orders
    where status not in ('cancelled', 'delivered')
  ),
  open_pos as (
    select count(*)::bigint as cnt
    from public.purchase_orders
    where status in ('draft', 'sent', 'partially_received')
  )
  select p.cnt, p.amount, u.cnt, o.cnt
  from pending p, unfulfilled u, open_pos o;
$$;

-- ===========================================================================
-- GRANTS
-- ===========================================================================

grant execute on function app.dashboard_sales_range(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function app.dashboard_sales_by_day(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function app.dashboard_sales_by_month(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function app.dashboard_sales_by_category(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function app.dashboard_top_products(timestamptz, timestamptz, integer) to authenticated, service_role;
grant execute on function app.dashboard_payment_breakdown(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function app.dashboard_payments_range(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function app.dashboard_receivables() to authenticated, service_role;
grant execute on function app.dashboard_inventory_summary() to authenticated, service_role;
grant execute on function app.dashboard_inventory_by_category() to authenticated, service_role;
grant execute on function app.dashboard_inventory_trend(integer) to authenticated, service_role;
grant execute on function app.dashboard_purchases_range(date, date) to authenticated, service_role;
grant execute on function app.dashboard_purchases_by_month(date, date) to authenticated, service_role;
grant execute on function app.dashboard_top_suppliers(date, date, integer) to authenticated, service_role;
grant execute on function app.dashboard_payables() to authenticated, service_role;
grant execute on function app.dashboard_expenses_range(date, date) to authenticated, service_role;
grant execute on function app.dashboard_expenses_by_category(date, date) to authenticated, service_role;
grant execute on function app.dashboard_expenses_by_month(date, date) to authenticated, service_role;
grant execute on function app.dashboard_customers_summary(timestamptz, timestamptz) to authenticated, service_role;
grant execute on function app.dashboard_top_customers(timestamptz, timestamptz, integer) to authenticated, service_role;
grant execute on function app.dashboard_alerts() to authenticated, service_role;

-- Support indexes for dashboard range queries.
create index if not exists payments_payment_date_idx on public.payments (payment_date);
create index if not exists expenses_expense_date_idx on public.expenses (expense_date);
create index if not exists goods_receipts_received_date_idx on public.goods_receipts (received_date);
create index if not exists supplier_invoices_invoice_date_idx on public.supplier_invoices (invoice_date);
create index if not exists stock_movements_created_at_idx on public.stock_movements (created_at);
create index if not exists inventory_items_reorder_level_idx on public.inventory_items (reorder_level) where reorder_level is not null;
