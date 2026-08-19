import { createClient } from "@/lib/supabase/server";
import {
  BUSINESS_START_DATE,
  addDaysUtc,
  endOfDayUtc,
  getBusinessWeekRange,
  getMonthRange,
  getYearRange,
  isBusinessDay,
  previousBusinessDay,
  startOfDayUtc,
} from "@/lib/business-calendar";

/**
 * Dashboard data layer.
 *
 * The previous dashboard aggregated server-side in PostgreSQL (app.* RPC
 * functions). Those functions are no longer exposed to PostgREST, so every
 * aggregation in this module runs in TypeScript on the server using the
 * authenticated client — RLS still applies per query, and the PostgREST
 * 1,000-row cap is handled by paging (see `fetchAllPaged`). Only the columns
 * needed for the dashboard are fetched; tables are never pulled wholesale
 * into the browser.
 *
 * Date conventions (mirroring the store's business calendar):
 *   - Business start: Monday 17 January 2022 (BUSINESS_START_DATE).
 *   - Ghana is UTC+0 with no DST; all day bucketing runs in UTC.
 */

export type DashboardRangeKey =
  | "today"
  | "yesterday"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "opening"
  | "custom";

export type DashboardRange = {
  key: DashboardRangeKey;
  label: string;
  days: number;
  start: Date;
  end: Date;
};

export const RANGE_LABELS: Record<DashboardRangeKey, string> = {
  today: "Today",
  yesterday: "Previous Day",
  week: "This Week",
  month: "This Month",
  quarter: "This Quarter",
  year: "This Year",
  opening: "Since Opening",
  custom: "Custom Range",
};

const DAY_MS = 24 * 60 * 60 * 1000;

const DEFAULT_RANGE: DashboardRangeKey = "month";

function daysBetween(start: Date, end: Date): number {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isFinite(date.getTime()) ? date : null;
}

function clampToOpening(start: Date, end: Date): { start: Date; end: Date } {
  const clampedStart = startOfDayUtc(start) < BUSINESS_START_DATE ? BUSINESS_START_DATE : startOfDayUtc(start);
  const clampedEnd = end < clampedStart ? clampedStart : end;
  return { start: clampedStart, end: clampedEnd };
}

/**
 * Resolves the `?range=` search parameter into a concrete reporting window.
 *
 * Semantics (mirroring the store's business calendar, UTC):
 *   - today       -> the current business day; Sundays are non-operating, so
 *                    on a Sunday this reports the most recent operating day.
 *   - yesterday   -> the previous operating day (never a Sunday).
 *   - week        -> the current business week (Monday–Saturday).
 *   - month       -> the current calendar month.
 *   - quarter     -> the current calendar quarter.
 *   - year        -> the current calendar year.
 *   - opening     -> store opening date (2022-01-17) through today.
 *   - custom      -> exact `start`/`end` dates (ISO yyyy-mm-dd), clamped to
 *                    the store's opening date and today.
 *
 * Unknown or missing values fall back to the current month.
 */
export function resolveDashboardRange(
  params: { range?: string; start?: string; end?: string },
  now: Date = new Date(),
): DashboardRange {
  const key = (params.range ?? DEFAULT_RANGE) as DashboardRangeKey;
  const today = startOfDayUtc(now);

  switch (key) {
    case "today": {
      const day = isBusinessDay(now) ? today : startOfDayUtc(previousBusinessDay(now));
      return { key, label: RANGE_LABELS.today, days: 1, start: day, end: endOfDayUtc(day) };
    }
    case "yesterday": {
      const day = startOfDayUtc(previousBusinessDay(now));
      return { key, label: RANGE_LABELS.yesterday, days: 1, start: day, end: endOfDayUtc(day) };
    }
    case "week": {
      const { start, end } = getBusinessWeekRange(now);
      return { key, label: RANGE_LABELS.week, days: daysBetween(start, end), start, end };
    }
    case "month": {
      const { start, end } = getMonthRange(now);
      return { key, label: RANGE_LABELS.month, days: daysBetween(start, end), start, end };
    }
    case "quarter": {
      const quarterMonth = Math.floor(now.getUTCMonth() / 3) * 3;
      const start = new Date(Date.UTC(now.getUTCFullYear(), quarterMonth, 1));
      const end = endOfDayUtc(new Date(Date.UTC(now.getUTCFullYear(), quarterMonth + 3, 0)));
      return { key, label: RANGE_LABELS.quarter, days: daysBetween(start, end), start, end };
    }
    case "year": {
      const { start, end } = getYearRange(now);
      return { key, label: RANGE_LABELS.year, days: daysBetween(start, end), start, end };
    }
    case "opening": {
      const start = startOfDayUtc(BUSINESS_START_DATE);
      return { key, label: RANGE_LABELS.opening, days: daysBetween(start, today), start, end: endOfDayUtc(today) };
    }
    case "custom": {
      const rawStart = parseIsoDate(params.start);
      const rawEnd = parseIsoDate(params.end);
      if (!rawStart || !rawEnd) return buildRange(DEFAULT_RANGE, now);
      const ordered = rawStart <= rawEnd ? { start: rawStart, end: rawEnd } : { start: rawEnd, end: rawStart };
      const clamped = clampToOpening(ordered.start, ordered.end);
      const end = clamped.end > today ? today : clamped.end;
      return { key, label: RANGE_LABELS.custom, days: daysBetween(clamped.start, end), start: clamped.start, end: endOfDayUtc(end) };
    }
    default:
      return buildRange(DEFAULT_RANGE, now);
  }
}

function buildRange(key: DashboardRangeKey, now: Date): DashboardRange {
  return resolveDashboardRange({ range: key }, now);
}

/** The immediately preceding window of equal length. */
export function previousRange(range: DashboardRange): DashboardRange {
  const lengthMs = range.end.getTime() - range.start.getTime();
  const end = new Date(range.start.getTime() - 1);
  return {
    key: range.key,
    label: `Previous ${range.days} days`,
    days: range.days,
    start: new Date(end.getTime() - lengthMs),
    end,
  };
}

// ---------------------------------------------------------------------------
// Paged fetching (handles the PostgREST 1,000-row cap)
// ---------------------------------------------------------------------------

export type DashboardClient = Awaited<ReturnType<typeof createClient>>;

type FilterBuilder = ReturnType<ReturnType<DashboardClient["from"]>["select"]>;

type PagedResult = { data: unknown };

export async function fetchAllPaged<T>(
  fetcher: (rangeFrom: number, rangeTo: number) => PromiseLike<PagedResult>,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 0; page < 50; page += 1) {
    const from = page * pageSize;
    const result = await fetcher(from, from + pageSize - 1);
    if (!result) return rows;
    const batch = (result.data ?? []) as unknown as T[];
    rows.push(...batch);
    if (batch.length < pageSize) return rows;
  }
  return rows;
}

/**
 * Fetch every row of a query. A cheap `count=exact` head request first
 * establishes the page count so pages can be fetched in parallel.
 * `buildQuery` applies filters only; the helper applies select + range.
 */
async function fetchAllPagedParallel<T>(
  client: DashboardClient,
  table: string,
  select: string,
  buildQuery: (query: FilterBuilder) => FilterBuilder,
  pageSize = 1000,
  maxPages = 50,
): Promise<T[]> {
  const countResult = await buildQuery(
    client.from(table).select("*", { count: "exact", head: true }),
  );
  const total = countResult.count ?? 0;
  const pageCount = Math.min(Math.ceil(total / pageSize), maxPages);
  if (pageCount === 0) return [];

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, page) =>
      buildQuery(client.from(table).select(select, { count: "exact" })).range(
        page * pageSize,
        page * pageSize + pageSize - 1,
      ),
    ),
  );

  const rows: T[] = [];
  for (const result of pages) {
    if (result.error) return rows;
    rows.push(...((result.data ?? []) as unknown as T[]));
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Aggregation row types
// ---------------------------------------------------------------------------

export type SalesRangeData = {
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin: number;
  order_count: number;
  units_sold: number;
  average_order_value: number;
  cancelled_orders: number;
};

export type SalesTrendPoint = {
  day: string;
  revenue: number;
  gross_profit: number;
  order_count: number;
};

export type PaymentRangeData = {
  collected_total: number;
  collected_count: number;
  pending_count: number;
  pending_amount: number;
  refunds_total: number;
  refunds_count: number;
};

export type InventorySummary = {
  total_value: number;
  total_units: number;
  item_count: number;
  sku_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
};

export type ExpenseRangeData = {
  total: number;
  expense_count: number;
};

export type OutstandingRow = {
  name: string;
  order_count: number;
  outstanding: number;
};

export type TopProductRow = {
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  units: number;
  revenue: number;
};

export type RecentOrderRow = {
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: string;
  status: string;
  created_at: string;
};

export type OperationsAlerts = {
  pending_payment_count: number;
  pending_payment_amount: number;
  unfulfilled_order_count: number;
  open_po_count: number;
};

export type CustomerStats = {
  total_customers: number;
  new_in_range: number;
  repeat_customers: number;
};

type OrderRow = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  customer_id: string | null;
  order_number: string;
  guest_name: string | null;
  payment_status: string;
};

type OrderItemRow = {
  order_id: string;
  created_at: string;
  quantity: number;
  unit_cost: number | null;
  line_total: number;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
};

// ---------------------------------------------------------------------------
// Window helpers
// ---------------------------------------------------------------------------

function windowFilters(query: FilterBuilder, column: string, range: DashboardRange): FilterBuilder {
  return query
    .gte(column, range.start.toISOString())
    .lte(column, range.end.toISOString());
}

/** Parallel paged fetch of a time-windowed column set. */
function fetchWindowPaged<T>(
  client: DashboardClient,
  table: string,
  column: string,
  range: DashboardRange,
  select: string,
): Promise<T[]> {
  return fetchAllPagedParallel<T>(client, table, select, (query) =>
    windowFilters(query, column, range),
  );
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const round = (value: number, digits = 2): number =>
  Number.isFinite(value) ? Number(value.toFixed(digits)) : 0;

// ---------------------------------------------------------------------------
// Sales
// ---------------------------------------------------------------------------

export async function getSalesRange(
  client: DashboardClient,
  range: DashboardRange,
): Promise<SalesRangeData | null> {
  try {
    const [orders, items] = await Promise.all([
      fetchWindowPaged<OrderRow>(
        client,
        "orders",
        "created_at",
        range,
        "id, created_at, total_amount, status, customer_id, order_number, guest_name, payment_status",
      ),
      fetchWindowPaged<OrderItemRow>(
        client,
        "order_items",
        "created_at",
        range,
        "order_id, created_at, quantity, unit_cost, line_total, product_name, variant_name, sku",
      ),
    ]);

    const cancelledIds = new Set(
      orders.filter((order) => order.status === "cancelled").map((order) => order.id),
    );

    const sold = orders.filter((order) => !cancelledIds.has(order.id));
    const revenue = sold.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const orderCount = sold.length;
    const cancelledCount = cancelledIds.size;

    const itemsOfSold = items.filter((item) => !cancelledIds.has(item.order_id));
    const unitsSold = itemsOfSold.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const cogs = itemsOfSold.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_cost || 0),
      0,
    );

    const grossProfit = revenue - cogs;
    const grossMargin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
    const averageOrderValue = orderCount > 0 ? revenue / orderCount : 0;

    return {
      revenue: round(revenue),
      cogs: round(cogs),
      gross_profit: round(grossProfit),
      gross_margin: round(grossMargin),
      order_count: orderCount,
      units_sold: round(unitsSold, 3),
      average_order_value: round(averageOrderValue),
      cancelled_orders: cancelledCount,
    };
  } catch {
    return null;
  }
}

/**
 * Daily (or monthly, for long ranges) revenue / gross-profit / order-count
 * series used by the sales performance chart.
 */
export async function getSalesTrend(
  client: DashboardClient,
  range: DashboardRange,
): Promise<SalesTrendPoint[] | null> {
  try {
    const [orders, items] = await Promise.all([
      fetchWindowPaged<OrderRow>(
        client,
        "orders",
        "created_at",
        range,
        "id, created_at, total_amount, status",
      ),
      fetchWindowPaged<OrderItemRow>(
        client,
        "order_items",
        "created_at",
        range,
        "order_id, created_at, quantity, unit_cost",
      ),
    ]);

    const cancelledIds = new Set(
      orders.filter((order) => order.status === "cancelled").map((order) => order.id),
    );

    const orderByDay = new Map<string, { revenue: number; order_count: number }>();
    const cogsByDay = new Map<string, number>();
    const bucketOf = (timestamp: string) => toIsoDay(new Date(timestamp));

    for (const order of orders) {
      if (cancelledIds.has(order.id)) continue;
      const day = bucketOf(order.created_at);
      const bucket = orderByDay.get(day) ?? { revenue: 0, order_count: 0 };
      bucket.revenue += Number(order.total_amount || 0);
      bucket.order_count += 1;
      orderByDay.set(day, bucket);
    }

    for (const item of items) {
      if (cancelledIds.has(item.order_id)) continue;
      const day = bucketOf(item.created_at);
      cogsByDay.set(day, (cogsByDay.get(day) ?? 0) + Number(item.quantity || 0) * Number(item.unit_cost || 0));
    }

    if (range.days > 120) {
      return bucketByMonth(orderByDay, cogsByDay, range);
    }

    const points: SalesTrendPoint[] = [];
    for (
      let cursor = startOfDayUtc(range.start);
      cursor <= endOfDayUtc(range.end);
      cursor = addDaysUtc(cursor, 1)
    ) {
      const day = toIsoDay(cursor);
      const ordersOnDay = orderByDay.get(day);
      const revenue = ordersOnDay?.revenue ?? 0;
      const cogs = cogsByDay.get(day) ?? 0;
      points.push({
        day,
        revenue: round(revenue),
        gross_profit: round(revenue - cogs),
        order_count: ordersOnDay?.order_count ?? 0,
      });
    }
    return points;
  } catch {
    return null;
  }
}

function bucketByMonth(
  orderByDay: Map<string, { revenue: number; order_count: number }>,
  cogsByDay: Map<string, number>,
  range: DashboardRange,
): SalesTrendPoint[] {
  const points: SalesTrendPoint[] = [];
  let cursor = new Date(Date.UTC(range.start.getUTCFullYear(), range.start.getUTCMonth(), 1));
  const end = new Date(Date.UTC(range.end.getUTCFullYear(), range.end.getUTCMonth(), 1));
  while (cursor <= end) {
    const month = toIsoDay(cursor).slice(0, 7);
    let revenue = 0;
    let orderCount = 0;
    let cogs = 0;
    for (const [day, value] of orderByDay) {
      if (day.startsWith(month)) {
        revenue += value.revenue;
        orderCount += value.order_count;
      }
    }
    for (const [day, value] of cogsByDay) {
      if (day.startsWith(month)) {
        cogs += value;
      }
    }
    points.push({
      day: month,
      revenue: round(revenue),
      gross_profit: round(revenue - cogs),
      order_count: orderCount,
    });
    cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }
  return points;
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export async function getPaymentsRange(
  client: DashboardClient,
  range: DashboardRange,
): Promise<PaymentRangeData | null> {
  try {
    const [payments, refunds] = await Promise.all([
      fetchWindowPaged<{ amount: number; status: string }>(
        client,
        "payments",
        "payment_date",
        range,
        "amount, status",
      ),
      fetchWindowPaged<{ amount: number; status: string }>(
        client,
        "refunds",
        "created_at",
        range,
        "amount, status",
      ),
    ]);

    const collected = payments.filter((payment) =>
      ["paid", "authorized"].includes(payment.status),
    );
    const pending = payments.filter((payment) => payment.status === "pending");
    const refunded = refunds.filter((refund) =>
      !["cancelled", "failed"].includes(refund.status),
    );

    return {
      collected_total: round(collected.reduce((sum, p) => sum + Number(p.amount || 0), 0)),
      collected_count: collected.length,
      pending_count: pending.length,
      pending_amount: round(pending.reduce((sum, p) => sum + Number(p.amount || 0), 0)),
      refunds_total: round(refunded.reduce((sum, r) => sum + Number(r.amount || 0), 0)),
      refunds_count: refunded.length,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------------------

export async function getInventorySummary(
  client: DashboardClient,
): Promise<InventorySummary | null> {
  try {
    const rows = await fetchAllPagedParallel<{
      variant_id: string;
      quantity_on_hand: number;
      average_cost: number | null;
      reorder_level: number | null;
    }>(
      client,
      "inventory_items",
      "variant_id, quantity_on_hand, average_cost, reorder_level",
      (query) => query,
    );

    let totalValue = 0;
    let totalUnits = 0;
    let lowStock = 0;
    let outOfStock = 0;
    const skuSet = new Set<string>();
    for (const row of rows) {
      const quantity = Number(row.quantity_on_hand || 0);
      totalUnits += quantity;
      totalValue += quantity * Number(row.average_cost || 0);
      if (row.variant_id) skuSet.add(row.variant_id);
      if (row.reorder_level != null && quantity <= Number(row.reorder_level)) lowStock += 1;
      if (quantity <= 0) outOfStock += 1;
    }

    return {
      total_value: round(totalValue),
      total_units: round(totalUnits, 3),
      item_count: rows.length,
      sku_count: skuSet.size,
      low_stock_count: lowStock,
      out_of_stock_count: outOfStock,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------

export async function getExpensesRange(
  client: DashboardClient,
  range: DashboardRange,
): Promise<ExpenseRangeData | null> {
  try {
    const rows = await fetchWindowPaged<{ amount: number }>(
      client,
      "expenses",
      "expense_date",
      range,
      "amount",
    );
    return {
      total: round(rows.reduce((sum, row) => sum + Number(row.amount || 0), 0)),
      expense_count: rows.length,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Receivables / payables
// ---------------------------------------------------------------------------

export async function getReceivables(
  client: DashboardClient,
  limit = 5,
): Promise<{ rows: OutstandingRow[]; total: number } | null> {
  try {
    const orders = await fetchAllPaged<{
      id: string;
      customer_id: string | null;
      guest_name: string | null;
      total_amount: number;
    }>((from, to) =>
      client
        .from("orders")
        .select("id, customer_id, guest_name, total_amount, payment_status")
        .neq("status", "cancelled")
        .in("payment_status", ["unpaid", "partially_paid"])
        .range(from, to),
    );

    if (orders.length === 0) {
      return { rows: [], total: 0 };
    }

    const payments = await fetchAllPaged<{ order_id: string; amount: number; status: string }>(
      (from, to) =>
        client
          .from("payments")
          .select("order_id, amount, status")
          .in("status", ["paid", "authorized"])
          .range(from, to),
    );

    const paidByOrder = new Map<string, number>();
    for (const payment of payments) {
      paidByOrder.set(
        payment.order_id,
        (paidByOrder.get(payment.order_id) ?? 0) + Number(payment.amount || 0),
      );
    }

    const customerIds = orders
      .map((order) => order.customer_id)
      .filter((id): id is string => Boolean(id));
    const customers = new Map<string, string>();
    if (customerIds.length > 0) {
      for (let i = 0; i < customerIds.length; i += 900) {
        const batch = customerIds.slice(i, i + 900);
        const { data } = await client
          .from("customers")
          .select("id, first_name, last_name")
          .in("id", batch);
        for (const customer of data ?? []) {
          customers.set(
            customer.id,
            [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
              "Customer",
          );
        }
      }
    }

    const byCustomer = new Map<string, OutstandingRow>();
    for (const order of orders) {
      const paid = paidByOrder.get(order.id) ?? 0;
      const outstanding = Number(order.total_amount || 0) - paid;
      if (outstanding <= 0) continue;
      const name =
        (order.customer_id ? customers.get(order.customer_id) : null) ??
        order.guest_name ??
        "Guest";
      const row = byCustomer.get(name) ?? { name, order_count: 0, outstanding: 0 };
      row.order_count += 1;
      row.outstanding += outstanding;
      byCustomer.set(name, row);
    }

    const rows = [...byCustomer.values()]
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, limit)
      .map((row) => ({ ...row, outstanding: round(row.outstanding) }));

    const total = round(
      [...byCustomer.values()].reduce((sum, row) => sum + row.outstanding, 0),
    );

    return { rows, total };
  } catch {
    return null;
  }
}

export async function getPayables(
  client: DashboardClient,
  limit = 5,
): Promise<{ rows: OutstandingRow[]; total: number } | null> {
  try {
    const invoices = await fetchAllPaged<{
      id: string;
      supplier_id: string | null;
      amount: number;
    }>((from, to) =>
      client
        .from("supplier_invoices")
        .select("id, supplier_id, amount, status")
        .in("status", ["pending", "partially_paid"])
        .range(from, to),
    );

    if (invoices.length === 0) {
      return { rows: [], total: 0 };
    }

    const payments = await fetchAllPaged<{ invoice_id: string; amount: number }>((from, to) =>
      client.from("purchase_payments").select("invoice_id, amount").range(from, to),
    );

    const paidByInvoice = new Map<string, number>();
    for (const payment of payments) {
      paidByInvoice.set(
        payment.invoice_id,
        (paidByInvoice.get(payment.invoice_id) ?? 0) + Number(payment.amount || 0),
      );
    }

    const supplierIds = invoices
      .map((invoice) => invoice.supplier_id)
      .filter((id): id is string => Boolean(id));
    const suppliers = new Map<string, string>();
    if (supplierIds.length > 0) {
      for (let i = 0; i < supplierIds.length; i += 900) {
        const batch = supplierIds.slice(i, i + 900);
        const { data } = await client.from("suppliers").select("id, name").in("id", batch);
        for (const supplier of data ?? []) {
          suppliers.set(supplier.id, supplier.name);
        }
      }
    }

    const bySupplier = new Map<string, OutstandingRow>();
    for (const invoice of invoices) {
      const paid = paidByInvoice.get(invoice.id) ?? 0;
      const outstanding = Number(invoice.amount || 0) - paid;
      if (outstanding <= 0) continue;
      const name = invoice.supplier_id
        ? suppliers.get(invoice.supplier_id) ?? "Unknown supplier"
        : "Unknown supplier";
      const row = bySupplier.get(name) ?? { name, order_count: 0, outstanding: 0 };
      row.order_count += 1;
      row.outstanding += outstanding;
      bySupplier.set(name, row);
    }

    const rows = [...bySupplier.values()]
      .sort((a, b) => b.outstanding - a.outstanding)
      .slice(0, limit)
      .map((row) => ({ ...row, outstanding: round(row.outstanding) }));

    const total = round(
      [...bySupplier.values()].reduce((sum, row) => sum + row.outstanding, 0),
    );

    return { rows, total };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Operations
// ---------------------------------------------------------------------------

export async function getOperationsAlerts(
  client: DashboardClient,
): Promise<OperationsAlerts | null> {
  try {
    const [pendingPayments, unfulfilled, openPos] = await Promise.all([
      fetchAllPaged<{ amount: number }>((from, to) =>
        client.from("payments").select("amount").eq("status", "pending").range(from, to),
      ),
      client
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(cancelled,delivered)"),
      client
        .from("purchase_orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["draft", "sent", "partially_received"]),
    ]);

    return {
      pending_payment_count: pendingPayments.length,
      pending_payment_amount: round(
        pendingPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
      ),
      unfulfilled_order_count: unfulfilled.count ?? 0,
      open_po_count: openPos.count ?? 0,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Products & orders
// ---------------------------------------------------------------------------

export async function getTopProducts(
  client: DashboardClient,
  range: DashboardRange,
  limit = 6,
): Promise<TopProductRow[] | null> {
  try {
    const [orders, items] = await Promise.all([
      fetchWindowPaged<{ id: string; status: string }>(
        client,
        "orders",
        "created_at",
        range,
        "id, status",
      ),
      fetchWindowPaged<OrderItemRow>(
        client,
        "order_items",
        "created_at",
        range,
        "order_id, quantity, line_total, product_name, variant_name, sku",
      ),
    ]);

    const cancelledIds = new Set(
      orders.filter((order) => order.status === "cancelled").map((order) => order.id),
    );

    const byProduct = new Map<string, TopProductRow>();
    for (const item of items) {
      if (cancelledIds.has(item.order_id)) continue;
      const key = item.variant_name ? `${item.product_name} · ${item.variant_name}` : item.product_name;
      const row = byProduct.get(key) ?? {
        product_name: item.product_name,
        variant_name: item.variant_name,
        sku: item.sku,
        units: 0,
        revenue: 0,
      };
      row.units += Number(item.quantity || 0);
      row.revenue += Number(item.line_total || 0);
      byProduct.set(key, row);
    }

    return [...byProduct.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((row) => ({ ...row, units: round(row.units, 3), revenue: round(row.revenue) }));
  } catch {
    return null;
  }
}

export async function getRecentOrders(
  client: DashboardClient,
  limit = 8,
): Promise<RecentOrderRow[] | null> {
  try {
    const { data, error } = await client
      .from("orders")
      .select("order_number, customer_id, guest_name, total_amount, payment_status, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return null;

    const rows = (data ?? []) as unknown as RecentOrderRow[];

    const customerIds = rows
      .map((order) => (order as unknown as { customer_id: string | null }).customer_id)
      .filter((id): id is string => Boolean(id));
    const customers = new Map<string, string>();
    if (customerIds.length > 0) {
      const { data: customerRows } = await client
        .from("customers")
        .select("id, first_name, last_name")
        .in("id", customerIds);
      for (const customer of customerRows ?? []) {
        customers.set(
          customer.id,
          [customer.first_name, customer.last_name].filter(Boolean).join(" ") || "Customer",
        );
      }
    }

    return rows.map((order) => {
      const raw = order as unknown as { customer_id: string | null; guest_name: string | null };
      return {
        order_number: order.order_number,
        customer_name:
          (raw.customer_id ? customers.get(raw.customer_id) : null) ??
          raw.guest_name ??
          "Guest",
        total_amount: order.total_amount,
        payment_status: order.payment_status,
        status: order.status,
        created_at: order.created_at,
      };
    });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export async function getCustomerStats(
  client: DashboardClient,
  range: DashboardRange,
): Promise<CustomerStats | null> {
  try {
    const [totalResult, newResult, orders] = await Promise.all([
      client.from("customers").select("id", { count: "exact", head: true }),
      client
        .from("customers")
        .select("id", { count: "exact", head: true })
        .gte("created_at", range.start.toISOString())
        .lte("created_at", range.end.toISOString()),
      fetchWindowPaged<{ customer_id: string | null; status: string }>(
        client,
        "orders",
        "created_at",
        range,
        "customer_id, status",
      ),
    ]);

    const counts = new Map<string, number>();
    for (const order of orders) {
      if (!order.customer_id || order.status === "cancelled") continue;
      counts.set(order.customer_id, (counts.get(order.customer_id) ?? 0) + 1);
    }
    const repeatCustomers = [...counts.values()].filter((count) => count >= 2).length;

    return {
      total_customers: totalResult.count ?? 0,
      new_in_range: newResult.count ?? 0,
      repeat_customers: repeatCustomers,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Business intelligence
// ---------------------------------------------------------------------------

export type TopCustomerRow = {
  name: string;
  order_count: number;
  revenue: number;
};

export type CategorySalesRow = {
  category: string;
  revenue: number;
  units: number;
  share: number;
};

export async function getTopCustomers(
  client: DashboardClient,
  range: DashboardRange,
  limit = 5,
): Promise<TopCustomerRow[] | null> {
  try {
    const orders = await fetchWindowPaged<{
      id: string;
      customer_id: string | null;
      guest_name: string | null;
      total_amount: number;
      status: string;
    }>(client, "orders", "created_at", range, "id, customer_id, guest_name, total_amount, status");

    const sold = orders.filter((order) => order.status !== "cancelled");

    const customerIds = sold
      .map((order) => order.customer_id)
      .filter((id): id is string => Boolean(id));
    const customers = new Map<string, string>();
    if (customerIds.length > 0) {
      for (let i = 0; i < customerIds.length; i += 900) {
        const batch = customerIds.slice(i, i + 900);
        const { data } = await client
          .from("customers")
          .select("id, first_name, last_name, business_name")
          .in("id", batch);
        for (const customer of data ?? []) {
          const name =
            [customer.first_name, customer.last_name].filter(Boolean).join(" ") ||
            customer.business_name ||
            "Customer";
          customers.set(customer.id, name);
        }
      }
    }

    const byKey = new Map<string, TopCustomerRow>();
    for (const order of sold) {
      const key = order.customer_id
        ? `customer:${order.customer_id}`
        : `guest:${order.guest_name ?? ""}`;
      const name = order.customer_id
        ? customers.get(order.customer_id) ?? "Customer"
        : order.guest_name ?? "Guest";
      const row = byKey.get(key) ?? { name, order_count: 0, revenue: 0 };
      row.order_count += 1;
      row.revenue += Number(order.total_amount || 0);
      byKey.set(key, row);
    }

    return [...byKey.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit)
      .map((row) => ({ ...row, revenue: round(row.revenue) }));
  } catch {
    return null;
  }
}

export async function getCategorySales(
  client: DashboardClient,
  range: DashboardRange,
  limit = 6,
): Promise<CategorySalesRow[] | null> {
  try {
    const [items, orders] = await Promise.all([
      fetchWindowPaged<{ order_id: string; variant_id: string | null; quantity: number; line_total: number }>(
        client,
        "order_items",
        "created_at",
        range,
        "order_id, variant_id, quantity, line_total",
      ),
      fetchWindowPaged<{ id: string; status: string }>(
        client,
        "orders",
        "created_at",
        range,
        "id, status",
      ),
    ]);

    const cancelledIds = new Set(
      orders.filter((order) => order.status === "cancelled").map((order) => order.id),
    );
    const soldItems = items.filter((item) => !cancelledIds.has(item.order_id));

    const variantIds = soldItems
      .map((item) => item.variant_id)
      .filter((id): id is string => Boolean(id));
    const variantToProduct = new Map<string, string>();
    for (let i = 0; i < variantIds.length; i += 900) {
      const batch = variantIds.slice(i, i + 900);
      const { data } = await client
        .from("product_variants")
        .select("id, product_id")
        .in("id", batch);
      for (const variant of data ?? []) {
        variantToProduct.set(variant.id, variant.product_id);
      }
    }

    const productIds = [...new Set(variantToProduct.values())];
    const productToCategory = new Map<string, string>();
    for (let i = 0; i < productIds.length; i += 900) {
      const batch = productIds.slice(i, i + 900);
      const { data } = await client
        .from("products")
        .select("id, category_id")
        .in("id", batch);
      for (const product of data ?? []) {
        productToCategory.set(product.id, product.category_id);
      }
    }

    const categoryIds = [...new Set(productToCategory.values())];
    const categories = new Map<string, string>();
    for (let i = 0; i < categoryIds.length; i += 900) {
      const batch = categoryIds.slice(i, i + 900);
      const { data } = await client.from("categories").select("id, name").in("id", batch);
      for (const category of data ?? []) {
        categories.set(category.id, category.name);
      }
    }

    const byCategory = new Map<string, { revenue: number; units: number }>();
    for (const item of soldItems) {
      if (!item.variant_id) continue;
      const productId = variantToProduct.get(item.variant_id);
      const categoryId = productId ? productToCategory.get(productId) : undefined;
      const name = categoryId ? categories.get(categoryId) : undefined;
      if (!name) continue;
      const row = byCategory.get(name) ?? { revenue: 0, units: 0 };
      row.revenue += Number(item.line_total || 0);
      row.units += Number(item.quantity || 0);
      byCategory.set(name, row);
    }

    const rows = [...byCategory.entries()]
      .map(([category, value]) => ({
        category,
        revenue: round(value.revenue),
        units: round(value.units, 3),
        share: 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);

    const categorizedTotal = rows.reduce((sum, row) => sum + row.revenue, 0);
    return rows.map((row) => ({
      ...row,
      share: categorizedTotal > 0 ? (row.revenue / categorizedTotal) * 100 : 0,
    }));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Enhanced reporting
// ---------------------------------------------------------------------------

export type InventoryCategoryRow = {
  category: string;
  value: number;
  units: number;
  share: number;
};

export type GoodsReceivedPoint = {
  month: string;
  value: number;
  units: number;
  receipt_count: number;
};

export type ExpenseMonthPoint = {
  month: string;
  total: number;
  count: number;
};

export type ExpenseSnapshot = {
  today_total: number;
  today_count: number;
  month_total: number;
  month_count: number;
  year_total: number;
  year_count: number;
};

export type ExpenseCategoryRow = {
  category: string;
  total: number;
  count: number;
  share: number;
};

export type PurchasingOverview = {
  month_value: number;
  month_units: number;
  month_receipt_count: number;
  year_value: number;
  year_receipt_count: number;
  open_po_count: number;
  open_po_value: number;
  outstanding_invoices: number;
  outstanding_total: number;
};

export type CollectionMethodRow = {
  method: string;
  amount: number;
  count: number;
  share: number;
};

export type RecentPaymentRow = {
  order_number: string | null;
  amount: number;
  method: string | null;
  status: string;
  reference: string | null;
  payment_date: string;
};

export type RecentStockMovementRow = {
  movement_type: string;
  quantity_change: number;
  unit_cost: number | null;
  product_name: string;
  variant_name: string | null;
  sku: string | null;
  created_at: string;
};

export type RecentPurchaseOrderRow = {
  po_number: string;
  status: string | null;
  supplier_name: string | null;
  created_at: string;
};

export type CustomerGrowthMonth = {
  month: string;
  new_count: number;
  cumulative: number;
};

export type BusinessLifetime = {
  revenue: number;
  orders: number;
  units_sold: number;
  best_day: { day: string; revenue: number } | null;
  best_month: { month: string; revenue: number } | null;
  top_product: { name: string; revenue: number } | null;
  top_category: { category: string; revenue: number } | null;
};

function yearRangeFor(year: number): DashboardRange {
  const { start, end } = getYearRange(new Date(Date.UTC(year, 0, 1)));
  return { key: "year", label: String(year), days: daysBetween(start, end), start, end };
}

/** Inventory value and units on hand grouped by product category. */
export async function getInventoryByCategory(
  client: DashboardClient,
  limit = 6,
): Promise<InventoryCategoryRow[] | null> {
  try {
    const items = await fetchAllPagedParallel<{
      variant_id: string | null;
      quantity_on_hand: number;
      average_cost: number | null;
    }>(
      client,
      "inventory_items",
      "variant_id, quantity_on_hand, average_cost",
      (query) => query,
    );

    if (items.length === 0) return [];

    const variantIds = items
      .map((item) => item.variant_id)
      .filter((id): id is string => Boolean(id));
    const variantToProduct = new Map<string, string>();
    for (let i = 0; i < variantIds.length; i += 900) {
      const batch = variantIds.slice(i, i + 900);
      const { data } = await client
        .from("product_variants")
        .select("id, product_id")
        .in("id", batch);
      for (const variant of data ?? []) variantToProduct.set(variant.id, variant.product_id);
    }

    const productIds = [...new Set(variantToProduct.values())];
    const productToCategory = new Map<string, string>();
    for (let i = 0; i < productIds.length; i += 900) {
      const batch = productIds.slice(i, i + 900);
      const { data } = await client.from("products").select("id, category_id").in("id", batch);
      for (const product of data ?? []) productToCategory.set(product.id, product.category_id);
    }

    const categoryIds = [...new Set(productToCategory.values())];
    const categories = new Map<string, string>();
    for (let i = 0; i < categoryIds.length; i += 900) {
      const batch = categoryIds.slice(i, i + 900);
      const { data } = await client.from("categories").select("id, name").in("id", batch);
      for (const category of data ?? []) categories.set(category.id, category.name);
    }

    const byCategory = new Map<string, { value: number; units: number }>();
    for (const item of items) {
      const productId = item.variant_id ? variantToProduct.get(item.variant_id) : undefined;
      const categoryId = productId ? productToCategory.get(productId) : undefined;
      const name = categoryId ? categories.get(categoryId) : undefined;
      const quantity = Number(item.quantity_on_hand || 0);
      const value = quantity * Number(item.average_cost || 0);
      if (!name) continue;
      const row = byCategory.get(name) ?? { value: 0, units: 0 };
      row.value += value;
      row.units += quantity;
      byCategory.set(name, row);
    }

    const rows = [...byCategory.entries()]
      .map(([category, value]) => ({
        category,
        value: round(value.value),
        units: round(value.units, 3),
        share: 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);

    const categorizedValue = rows.reduce((sum, row) => sum + row.value, 0);
    return rows.map((row) => ({
      ...row,
      share: categorizedValue > 0 ? (row.value / categorizedValue) * 100 : 0,
    }));
  } catch {
    return null;
  }
}

/** Monthly goods received (value, units and receipt count) for a calendar year. */
export async function getGoodsReceivedByMonth(
  client: DashboardClient,
  year: number,
): Promise<GoodsReceivedPoint[] | null> {
  try {
    const range = yearRangeFor(year);
    const receipts = await fetchWindowPaged<{
      id: string;
      received_date: string;
      status: string;
    }>(client, "goods_receipts", "received_date", range, "id, received_date, status");

    const valid = receipts.filter((receipt) =>
      ["received", "completed"].includes(receipt.status),
    );
    const receiptIds = valid.map((receipt) => receipt.id);

    const items: {
      goods_receipt_id: string;
      quantity_received: number;
      unit_cost_actual: number;
    }[] = [];
    for (let i = 0; i < receiptIds.length; i += 900) {
      const batch = receiptIds.slice(i, i + 900);
      const { data } = await client
        .from("goods_receipt_items")
        .select("goods_receipt_id, quantity_received, unit_cost_actual")
        .in("goods_receipt_id", batch);
      items.push(...((data ?? []) as unknown as typeof items));
    }

    const byReceipt = new Map<string, { value: number; units: number }>();
    for (const item of items) {
      const row = byReceipt.get(item.goods_receipt_id) ?? { value: 0, units: 0 };
      row.units += Number(item.quantity_received || 0);
      row.value += Number(item.quantity_received || 0) * Number(item.unit_cost_actual || 0);
      byReceipt.set(item.goods_receipt_id, row);
    }

    const points: GoodsReceivedPoint[] = [];
    for (let month = 0; month < 12; month += 1) {
      const key = `${String(year)}-${String(month + 1).padStart(2, "0")}`;
      let value = 0;
      let units = 0;
      let count = 0;
      for (const receipt of valid) {
        if (!receipt.received_date.startsWith(key)) continue;
        count += 1;
        const summary = byReceipt.get(receipt.id);
        if (summary) {
          value += summary.value;
          units += summary.units;
        }
      }
      points.push({ month: key, value: round(value), units: round(units, 3), receipt_count: count });
    }
    return points;
  } catch {
    return null;
  }
}

/** Monthly expense totals for a calendar year. */
export async function getExpensesByMonth(
  client: DashboardClient,
  year: number,
): Promise<ExpenseMonthPoint[] | null> {
  try {
    const range = yearRangeFor(year);
    const rows = await fetchWindowPaged<{ amount: number; expense_date: string }>(
      client,
      "expenses",
      "expense_date",
      range,
      "amount, expense_date",
    );

    const byMonth = new Map<string, { total: number; count: number }>();
    for (const row of rows) {
      const key = row.expense_date.slice(0, 7);
      const bucket = byMonth.get(key) ?? { total: 0, count: 0 };
      bucket.total += Number(row.amount || 0);
      bucket.count += 1;
      byMonth.set(key, bucket);
    }

    const points: ExpenseMonthPoint[] = [];
    for (let month = 0; month < 12; month += 1) {
      const key = `${String(year)}-${String(month + 1).padStart(2, "0")}`;
      const bucket = byMonth.get(key) ?? { total: 0, count: 0 };
      points.push({ month: key, total: round(bucket.total), count: bucket.count });
    }
    return points;
  } catch {
    return null;
  }
}

/** Today / this-month / this-year expense totals derived from a single year fetch. */
export async function getExpenseSnapshot(
  client: DashboardClient,
  now: Date = new Date(),
): Promise<ExpenseSnapshot | null> {
  try {
    const rows = await getExpensesByMonth(client, now.getUTCFullYear());
    if (rows === null) return null;

    const todayKey = toIsoDay(now);
    const monthKey = `${String(now.getUTCFullYear())}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    let todayTotal = 0;
    let todayCount = 0;
    let monthTotal = 0;
    let monthCount = 0;
    let yearTotal = 0;
    let yearCount = 0;

    for (const point of rows) {
      yearTotal += point.total;
      yearCount += point.count;
      if (point.month === monthKey) {
        monthTotal = point.total;
        monthCount = point.count;
      }
    }

    const dayRows = await fetchWindowPaged<{ amount: number; expense_date: string }>(
      client,
      "expenses",
      "expense_date",
      {
        key: "today",
        label: "Today",
        days: 1,
        start: startOfDayUtc(now),
        end: endOfDayUtc(now),
      },
      "amount, expense_date",
    );
    for (const row of dayRows) {
      if (!row.expense_date.startsWith(todayKey)) continue;
      todayTotal += Number(row.amount || 0);
      todayCount += 1;
    }

    return {
      today_total: round(todayTotal),
      today_count: todayCount,
      month_total: round(monthTotal),
      month_count: monthCount,
      year_total: round(yearTotal),
      year_count: yearCount,
    };
  } catch {
    return null;
  }
}

/** Expense totals grouped by category for a reporting window. */
export async function getExpensesByCategory(
  client: DashboardClient,
  range: DashboardRange,
  limit = 6,
): Promise<ExpenseCategoryRow[] | null> {
  try {
    const rows = await fetchWindowPaged<{ amount: number; category_id: string }>(
      client,
      "expenses",
      "expense_date",
      range,
      "amount, category_id",
    );

    const categoryIds = [...new Set(rows.map((row) => row.category_id).filter(Boolean))];
    const categories = new Map<string, string>();
    for (let i = 0; i < categoryIds.length; i += 900) {
      const batch = categoryIds.slice(i, i + 900);
      const { data } = await client
        .from("expense_categories")
        .select("id, name")
        .in("id", batch);
      for (const category of data ?? []) categories.set(category.id, category.name);
    }

    const byCategory = new Map<string, { total: number; count: number }>();
    for (const row of rows) {
      const name = categories.get(row.category_id) ?? "Uncategorised";
      const bucket = byCategory.get(name) ?? { total: 0, count: 0 };
      bucket.total += Number(row.amount || 0);
      bucket.count += 1;
      byCategory.set(name, bucket);
    }

    const totals = [...byCategory.entries()]
      .map(([category, value]) => ({
        category,
        total: round(value.total),
        count: value.count,
        share: 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, limit);

    const categorizedTotal = totals.reduce((sum, row) => sum + row.total, 0);
    return totals.map((row) => ({
      ...row,
      share: categorizedTotal > 0 ? (row.total / categorizedTotal) * 100 : 0,
    }));
  } catch {
    return null;
  }
}

/** Purchasing snapshot: receipts this month/year, open POs and outstanding invoices. */
export async function getPurchasingOverview(
  client: DashboardClient,
  now: Date = new Date(),
): Promise<PurchasingOverview | null> {
  try {
    const year = now.getUTCFullYear();
    const monthKey = `${String(year)}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

    const [monthly, openPos, payables] = await Promise.all([
      getGoodsReceivedByMonth(client, year),
      fetchAllPagedParallel<{ id: string }>(
        client,
        "purchase_orders",
        "id",
        (query) => query.in("status", ["draft", "sent", "partially_received"]),
      ),
      getPayables(client, 5),
    ]);

    const monthPoint = monthly?.find((point) => point.month === monthKey);

    const openPoIds = openPos.map((po) => po.id);
    let openPoValue = 0;
    for (let i = 0; i < openPoIds.length; i += 900) {
      const batch = openPoIds.slice(i, i + 900);
      const { data } = await client
        .from("purchase_order_items")
        .select("quantity_ordered, quantity_received, unit_cost_expected")
        .in("purchase_order_id", batch);
      for (const item of (data ?? []) as unknown as {
        quantity_ordered: number;
        quantity_received: number;
        unit_cost_expected: number;
      }[]) {
        openPoValue +=
          (Number(item.quantity_ordered || 0) - Number(item.quantity_received || 0)) *
          Number(item.unit_cost_expected || 0);
      }
    }

    const yearly = monthly ?? [];
    return {
      month_value: monthPoint?.value ?? 0,
      month_units: monthPoint?.units ?? 0,
      month_receipt_count: monthPoint?.receipt_count ?? 0,
      year_value: round(yearly.reduce((sum, point) => sum + point.value, 0)),
      year_receipt_count: yearly.reduce((sum, point) => sum + point.receipt_count, 0),
      open_po_count: openPoIds.length,
      open_po_value: round(openPoValue),
      outstanding_invoices:
        payables?.rows.reduce((sum, row) => sum + row.order_count, 0) ?? 0,
      outstanding_total: payables?.total ?? 0,
    };
  } catch {
    return null;
  }
}

/** Collected (paid/authorized) payments grouped by payment method. */
export async function getCollectionsByMethod(
  client: DashboardClient,
  range: DashboardRange,
): Promise<CollectionMethodRow[] | null> {
  try {
    const rows = await fetchWindowPaged<{ amount: number; method: string; status: string }>(
      client,
      "payments",
      "payment_date",
      range,
      "amount, method, status",
    );

    const collected = rows.filter((payment) =>
      ["paid", "authorized"].includes(payment.status),
    );

    const byMethod = new Map<string, { amount: number; count: number }>();
    for (const payment of collected) {
      const method = payment.method || "other";
      const bucket = byMethod.get(method) ?? { amount: 0, count: 0 };
      bucket.amount += Number(payment.amount || 0);
      bucket.count += 1;
      byMethod.set(method, bucket);
    }

    const result = [...byMethod.entries()]
      .map(([method, value]) => ({
        method,
        amount: round(value.amount),
        count: value.count,
        share: 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    const total = result.reduce((sum, row) => sum + row.amount, 0);
    return result.map((row) => ({
      ...row,
      share: total > 0 ? (row.amount / total) * 100 : 0,
    }));
  } catch {
    return null;
  }
}

/** Latest customer payments across orders. */
export async function getRecentPayments(
  client: DashboardClient,
  limit = 6,
): Promise<RecentPaymentRow[] | null> {
  try {
    const { data, error } = await client
      .from("payments")
      .select("amount, method, status, reference, payment_date, orders(order_number)")
      .order("payment_date", { ascending: false })
      .limit(limit);
    if (error) return null;

    const rows = (data ?? []) as unknown as {
      amount: number;
      method: string;
      status: string;
      reference: string | null;
      payment_date: string;
      orders: { order_number: string } | null;
    }[];

    return rows.map((payment) => ({
      order_number: payment.orders?.order_number ?? null,
      amount: Number(payment.amount || 0),
      method: payment.method,
      status: payment.status,
      reference: payment.reference,
      payment_date: payment.payment_date,
    }));
  } catch {
    return null;
  }
}

/** Latest stock movements with the product/variant they relate to. */
export async function getRecentStockMovements(
  client: DashboardClient,
  limit = 6,
): Promise<RecentStockMovementRow[] | null> {
  try {
    const { data, error } = await client
      .from("stock_movements")
      .select(
        "movement_type, quantity_change, unit_cost, created_at, inventory_items(variant_id, product_variants(id, name, sku, products(name)))",
      )
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return null;

    const rows = (data ?? []) as unknown as {
      movement_type: string;
      quantity_change: number;
      unit_cost: number | null;
      created_at: string;
      inventory_items: {
        product_variants: {
          name: string | null;
          sku: string | null;
          products: { name: string } | null;
        } | null;
      } | null;
    }[];

    return rows.map((movement) => ({
      movement_type: movement.movement_type,
      quantity_change: Number(movement.quantity_change || 0),
      unit_cost: movement.unit_cost != null ? Number(movement.unit_cost) : null,
      product_name:
        movement.inventory_items?.product_variants?.products?.name ?? "Unknown product",
      variant_name: movement.inventory_items?.product_variants?.name ?? null,
      sku: movement.inventory_items?.product_variants?.sku ?? null,
      created_at: movement.created_at,
    }));
  } catch {
    return null;
  }
}

/** Latest purchase orders with their supplier. */
export async function getRecentPurchaseOrders(
  client: DashboardClient,
  limit = 6,
): Promise<RecentPurchaseOrderRow[] | null> {
  try {
    const { data, error } = await client
      .from("purchase_orders")
      .select("po_number, status, created_at, suppliers(name)")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return null;

    const rows = (data ?? []) as unknown as {
      po_number: string;
      status: string | null;
      created_at: string;
      suppliers: { name: string } | null;
    }[];

    return rows.map((po) => ({
      po_number: po.po_number,
      status: po.status,
      supplier_name: po.suppliers?.name ?? null,
      created_at: po.created_at,
    }));
  } catch {
    return null;
  }
}

/** New customers per month (trailing window) with a running total. */
export async function getCustomerGrowth(
  client: DashboardClient,
  months = 12,
  now: Date = new Date(),
): Promise<CustomerGrowthMonth[] | null> {
  try {
    const rows = await fetchAllPagedParallel<{ created_at: string }>(
      client,
      "customers",
      "created_at",
      (query) => query,
    );

    const byMonth = new Map<string, number>();
    for (const row of rows) {
      const key = row.created_at.slice(0, 7);
      byMonth.set(key, (byMonth.get(key) ?? 0) + 1);
    }

    const points: CustomerGrowthMonth[] = [];
    let cumulative = 0;
    const cursor = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1),
    );
    for (let i = 0; i < months; i += 1) {
      const key = toIsoDay(cursor).slice(0, 7);
      const newCount = byMonth.get(key) ?? 0;
      cumulative += newCount;
      points.push({ month: key, new_count: newCount, cumulative });
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }

    return points;
  } catch {
    return null;
  }
}

/** Lifetime highlights across the business since opening. */
export async function getBusinessLifetime(
  client: DashboardClient,
): Promise<BusinessLifetime | null> {
  try {
    const [orders, items] = await Promise.all([
      fetchAllPagedParallel<{
        id: string;
        created_at: string;
        total_amount: number;
        status: string;
      }>(client, "orders", "id, created_at, total_amount, status", (query) => query),
      fetchAllPagedParallel<{
        order_id: string;
        variant_id: string | null;
        quantity: number;
        line_total: number;
        product_name: string;
        variant_name: string;
      }>(
        client,
        "order_items",
        "order_id, variant_id, quantity, line_total, product_name, variant_name",
        (query) => query,
      ),
    ]);

    const cancelled = new Set(
      orders.filter((order) => order.status === "cancelled").map((order) => order.id),
    );
    const sold = orders.filter((order) => !cancelled.has(order.id));
    const soldItems = items.filter((item) => !cancelled.has(item.order_id));

    const revenue = sold.reduce((sum, order) => sum + Number(order.total_amount || 0), 0);
    const unitsSold = soldItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0,
    );

    const dayRevenue = new Map<string, number>();
    const monthRevenue = new Map<string, number>();
    for (const order of sold) {
      const day = toIsoDay(new Date(order.created_at));
      dayRevenue.set(day, (dayRevenue.get(day) ?? 0) + Number(order.total_amount || 0));
      const month = day.slice(0, 7);
      monthRevenue.set(month, (monthRevenue.get(month) ?? 0) + Number(order.total_amount || 0));
    }

    let bestDay: { day: string; revenue: number } | null = null;
    for (const [day, value] of dayRevenue) {
      if (!bestDay || value > bestDay.revenue) bestDay = { day, revenue: round(value) };
    }
    let bestMonth: { month: string; revenue: number } | null = null;
    for (const [month, value] of monthRevenue) {
      if (!bestMonth || value > bestMonth.revenue) bestMonth = { month, revenue: round(value) };
    }

    const byProduct = new Map<string, number>();
    for (const item of soldItems) {
      const key = item.variant_name
        ? `${item.product_name} · ${item.variant_name}`
        : item.product_name;
      byProduct.set(key, (byProduct.get(key) ?? 0) + Number(item.line_total || 0));
    }
    let topProduct: { name: string; revenue: number } | null = null;
    for (const [name, value] of byProduct) {
      if (!topProduct || value > topProduct.revenue) {
        topProduct = { name, revenue: round(value) };
      }
    }

    const variantIds = soldItems
      .map((item) => item.variant_id)
      .filter((id): id is string => Boolean(id));
    const variantToProduct = new Map<string, string>();
    for (let i = 0; i < variantIds.length; i += 900) {
      const batch = variantIds.slice(i, i + 900);
      const { data } = await client
        .from("product_variants")
        .select("id, product_id")
        .in("id", batch);
      for (const variant of data ?? []) variantToProduct.set(variant.id, variant.product_id);
    }
    const productIds = [...new Set(variantToProduct.values())];
    const productToCategory = new Map<string, string>();
    for (let i = 0; i < productIds.length; i += 900) {
      const batch = productIds.slice(i, i + 900);
      const { data } = await client.from("products").select("id, category_id").in("id", batch);
      for (const product of data ?? []) productToCategory.set(product.id, product.category_id);
    }
    const categoryIds = [...new Set(productToCategory.values())];
    const categories = new Map<string, string>();
    for (let i = 0; i < categoryIds.length; i += 900) {
      const batch = categoryIds.slice(i, i + 900);
      const { data } = await client.from("categories").select("id, name").in("id", batch);
      for (const category of data ?? []) categories.set(category.id, category.name);
    }

    const byCategory = new Map<string, number>();
    for (const item of soldItems) {
      if (!item.variant_id) continue;
      const productId = variantToProduct.get(item.variant_id);
      const categoryId = productId ? productToCategory.get(productId) : undefined;
      const name = categoryId ? categories.get(categoryId) : undefined;
      if (!name) continue;
      byCategory.set(name, (byCategory.get(name) ?? 0) + Number(item.line_total || 0));
    }
    let topCategory: { category: string; revenue: number } | null = null;
    for (const [category, value] of byCategory) {
      if (!topCategory || value > topCategory.revenue) {
        topCategory = { category, revenue: round(value) };
      }
    }

    return {
      revenue: round(revenue),
      orders: sold.length,
      units_sold: round(unitsSold, 3),
      best_day: bestDay,
      best_month: bestMonth,
      top_product: topProduct,
      top_category: topCategory,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Compact GHS amount, e.g. 158489195 -> "GH₵158.5M". */
export function formatCompactGHS(amount: number): string {
  if (!Number.isFinite(amount)) return "GH₵0";
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    return `${sign}GH₵${trimZeroes((abs / 1_000_000).toFixed(1))}M`;
  }
  if (abs >= 1_000) {
    return `${sign}GH₵${trimZeroes((abs / 1_000).toFixed(1))}k`;
  }
  return `${sign}GH₵${trimZeroes(abs.toFixed(0))}`;
}

/** Signed percentage change; null when there is no meaningful baseline. */
export function percentDelta(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  return ((current - previous) / previous) * 100;
}

function trimZeroes(value: string): string {
  return value.replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

export function greetingFor(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}