import { formatGHS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  BUSINESS_START_DATE,
  addDaysUtc,
  countBusinessDays,
  endOfDayUtc,
  getBusinessWeekRange,
  getMonthRange,
  getYearRange,
  isClosedDay,
  previousBusinessDay,
  startOfDayUtc,
} from "@/lib/business-calendar";

/**
 * Dashboard data layer.
 *
 * All aggregations run inside PostgreSQL (app.dashboard_* functions, see
 * migration 20260817040000_dashboard_aggregations.sql) so the dashboard is
 * not subject to the PostgREST 1,000-row row cap and stays fast with the full
 * catalogue. The functions are SECURITY INVOKER, so RLS (and therefore
 * per-module permissions) applies to every aggregate.
 *
 * If the aggregation functions are not yet deployed, every query returns
 * `null` and the UI degrades to an explicit "aggregations unavailable" state
 * rather than fabricated numbers.
 */

export type DashboardRangeKey =
  | "today"
  | "prev_business_day"
  | "week"
  | "month"
  | "quarter"
  | "year"
  | "since_opening"
  | "custom";

export type DashboardRange = {
  key: DashboardRangeKey;
  label: string;
  start: Date;
  end: Date;
  customFrom?: string;
  customTo?: string;
};

export const RANGE_PRESETS: { key: DashboardRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "prev_business_day", label: "Prev Business Day" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
  { key: "since_opening", label: "Since Opening" },
  { key: "custom", label: "Custom" },
];

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function toIsoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function clampRange(start: Date, end: Date): { start: Date; end: Date } {
  const clampedStart = start < BUSINESS_START_DATE ? BUSINESS_START_DATE : start;
  const now = new Date();
  const today = startOfDayUtc(now);
  const clampedEnd = end > endOfDayUtc(today) ? endOfDayUtc(today) : end;
  if (clampedEnd < clampedStart) {
    return { start: clampedStart, end: endOfDayUtc(clampedStart) };
  }
  return { start: clampedStart, end: clampedEnd };
}

export function resolveDashboardRange(
  params: { range?: string; from?: string; to?: string },
  now: Date = new Date(),
): DashboardRange {
  const key = (RANGE_PRESETS.some((p) => p.key === params.range)
    ? params.range
    : "today") as DashboardRangeKey;
  const today = startOfDayUtc(now);

  switch (key) {
    case "prev_business_day": {
      const day = previousBusinessDay(now);
      return {
        key,
        label: "Previous Business Day",
        start: startOfDayUtc(day),
        end: endOfDayUtc(day),
      };
    }
    case "week": {
      const week = getBusinessWeekRange(now);
      return { key, label: "This Business Week", start: week.start, end: week.end };
    }
    case "month": {
      const month = getMonthRange(now);
      return {
        key,
        label: month.start.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
        start: month.start,
        end: month.end,
      };
    }
    case "quarter": {
      const quarterStart = new Date(
        Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1),
      );
      const quarterEnd = new Date(
        Date.UTC(quarterStart.getUTCFullYear(), quarterStart.getUTCMonth() + 3, 0),
      );
      return {
        key,
        label: `Q${Math.floor(now.getUTCMonth() / 3) + 1} ${now.getUTCFullYear()}`,
        start: quarterStart,
        end: endOfDayUtc(quarterEnd),
      };
    }
    case "year": {
      const year = getYearRange(now);
      return { key, label: String(now.getUTCFullYear()), start: year.start, end: year.end };
    }
    case "since_opening": {
      return {
        key,
        label: "Since Opening",
        start: BUSINESS_START_DATE,
        end: endOfDayUtc(today),
      };
    }
    case "custom": {
      const from = parseIsoDate(params.from);
      const to = parseIsoDate(params.to);
      if (from && to) {
        const clamped = clampRange(from, to);
        return {
          key,
          label: `${toIsoDay(clamped.start)} — ${toIsoDay(clamped.end)}`,
          start: clamped.start,
          end: clamped.end,
          customFrom: toIsoDay(clamped.start),
          customTo: toIsoDay(clamped.end),
        };
      }
      return { key, label: "Today", start: today, end: endOfDayUtc(today) };
    }
    case "today":
    default: {
      return { key, label: "Today", start: today, end: endOfDayUtc(today) };
    }
  }
}

export function previousYearRange(range: DashboardRange): { start: Date; end: Date } {
  const start = addDaysUtc(range.start, -365);
  const end = addDaysUtc(range.end, -365);
  return clampRange(start, end);
}

/** Shift a date range back one year for year-over-year comparisons. */
export function sameRangeLastYear(range: DashboardRange): { start: Date; end: Date } {
  return previousYearRange(range);
}

// ---------------------------------------------------------------------------
// RPC access
// ---------------------------------------------------------------------------

type RpcResult<T> = { ok: true; data: T } | { ok: false };

async function rpc<T>(name: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  try {
    const client = await createClient();
    const { data, error } = await client.schema("app").rpc(name, args);
    if (error) {
      console.error(
        `[dashboard] RPC ${name} failed: code=${error.code} message=${error.message} details=${error.details ?? ""} hint=${error.hint ?? ""}`,
      );
      return { ok: false };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    console.error(`[dashboard] RPC ${name} threw:`, err);
    return { ok: false };
  }
}

function take<T>(result: RpcResult<T>): T | null {
  return result.ok ? result.data : null;
}

// ---------------------------------------------------------------------------
// Types
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

export type DayPoint = { day: string; revenue: number; gross_profit: number; order_count: number };
export type MonthPoint = { month: string; revenue: number; gross_profit: number; order_count: number };
export type CategoryPoint = {
  category_name: string;
  revenue: number;
  units: number;
  order_count: number;
};
export type TopProduct = {
  variant_name: string;
  product_name: string;
  sku: string;
  units: number;
  revenue: number;
};

export type PaymentsRangeData = {
  collected_total: number;
  collected_count: number;
  pending_count: number;
  pending_amount: number;
  refunds_total: number;
  refunds_count: number;
};

export type MethodPoint = { method: string; collected: number; payment_count: number };
export type ReceivableRow = { customer_name: string; order_count: number; outstanding: number };
export type PayableRow = { supplier_name: string; invoice_count: number; outstanding: number };

export type InventorySummary = {
  total_value: number;
  total_units: number;
  item_count: number;
  sku_count: number;
  low_stock_count: number;
  out_of_stock_count: number;
};

export type InventoryCategory = {
  category_name: string;
  value: number;
  units: number;
  item_count: number;
};
export type TrendPoint = { day: string; value: number; net_movement: number };

export type PurchasesRangeData = {
  receipts_value: number;
  receipt_count: number;
  po_count: number;
  invoice_count: number;
  invoices_value: number;
};

export type PurchasesMonthPoint = { month: string; receipts_value: number; receipt_count: number };
export type ExpenseMonthPoint = { month: string; total: number; expense_count: number };

export type SupplierPoint = { supplier_name: string; receipts_value: number; receipt_count: number };

export type ExpensesRangeData = { total: number; expense_count: number };
export type ExpenseCategoryPoint = {
  category_name: string;
  total: number;
  expense_count: number;
};

export type CustomersSummary = {
  total_customers: number;
  new_this_month: number;
  new_this_year: number;
  repeat_customers: number;
  total_orders: number;
  orders_per_customer: number;
};

export type CustomerPoint = { customer_name: string; order_count: number; spending: number };

export type AlertsData = {
  pending_payment_count: number;
  pending_payment_amount: number;
  unfulfilled_order_count: number;
  open_po_count: number;
};

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export type DashboardPerms = {
  sales: boolean;
  inventory: boolean;
  purchases: boolean;
  customers: boolean;
  expenses: boolean;
};

export type DashboardData = {
  range: DashboardRange;
  closedToday: boolean;
  rpcAvailable: boolean;
  // Sales — selected range, comparison ranges, and the fixed windows
  sales: SalesRangeData | null;
  todaySales: SalesRangeData | null;
  prevBusinessDay: SalesRangeData | null;
  week: SalesRangeData | null;
  month: SalesRangeData | null;
  quarter: SalesRangeData | null;
  year: SalesRangeData | null;
  lastYear: SalesRangeData | null;
  byDay: DayPoint[] | null;
  byMonth: MonthPoint[] | null;
  byCategory: CategoryPoint[] | null;
  topProducts: TopProduct[] | null;
  // Payments
  payments: PaymentsRangeData | null;
  paymentsToday: PaymentsRangeData | null;
  paymentsMonth: PaymentsRangeData | null;
  paymentsYear: PaymentsRangeData | null;
  paymentBreakdown: MethodPoint[] | null;
  receivables: ReceivableRow[] | null;
  // Alerts (current position)
  alerts: AlertsData | null;
  // Inventory (current position — range independent)
  inventory: InventorySummary | null;
  inventoryByCategory: InventoryCategory[] | null;
  inventoryTrend: TrendPoint[] | null;
  // Purchasing
  purchasesMonth: PurchasesRangeData | null;
  purchasesYear: PurchasesRangeData | null;
  purchasesByMonth: PurchasesMonthPoint[] | null;
  topSuppliers: SupplierPoint[] | null;
  payables: PayableRow[] | null;
  // Expenses
  expensesToday: ExpensesRangeData | null;
  expensesMonth: ExpensesRangeData | null;
  expensesYear: ExpensesRangeData | null;
  expensesSelected: ExpensesRangeData | null;
  expensesByCategory: ExpenseCategoryPoint[] | null;
  expensesByMonth: ExpenseMonthPoint[] | null;
  // Customers
  customers: CustomersSummary | null;
  topCustomers: CustomerPoint[] | null;
  // Historical performance (fixed "since opening" window)
  history: {
    sales: SalesRangeData | null;
    byMonth: MonthPoint[] | null;
    byDay: DayPoint[] | null;
    byCategory: CategoryPoint[] | null;
    topProducts: TopProduct[] | null;
    expenses: ExpensesRangeData | null;
    purchases: PurchasesRangeData | null;
    customers: CustomersSummary | null;
    businessDays: number;
  };
};

export async function getDashboardData(
  range: DashboardRange,
  perms: DashboardPerms,
): Promise<DashboardData> {
  const now = new Date();
  const today = startOfDayUtc(now);
  const closedToday = isClosedDay(now);

  const monthRange = getMonthRange(now);
  const yearRange = getYearRange(now);
  const weekRange = getBusinessWeekRange(now);
  const prevDay = previousBusinessDay(now);
  const quarterStart = new Date(
    Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1),
  );
  const quarterEnd = new Date(
    Date.UTC(quarterStart.getUTCFullYear(), quarterStart.getUTCMonth() + 3, 0),
  );
  const lastYear = previousYearRange(range);

  const args = (start: Date, end: Date) => ({
    p_start: start.toISOString(),
    p_end: end.toISOString(),
  });
  const dayArgs = (day: Date) => args(startOfDayUtc(day), endOfDayUtc(day));

  const selected = args(range.start, range.end);
  const todayWindow = dayArgs(today);
  const prevDayWindow = dayArgs(prevDay);
  const weekWindow = args(weekRange.start, weekRange.end);
  const monthWindow = args(monthRange.start, monthRange.end);
  const quarterWindow = args(quarterStart, quarterEnd);
  const yearWindow = args(yearRange.start, yearRange.end);
  const lastYearWindow = args(lastYear.start, lastYear.end);
  const sinceWindow = args(BUSINESS_START_DATE, endOfDayUtc(today));

  const invMonth = { p_start: toIsoDay(monthRange.start), p_end: toIsoDay(monthRange.end) };
  const invYear = { p_start: toIsoDay(yearRange.start), p_end: toIsoDay(yearRange.end) };
  const todayDay = toIsoDay(today);
  const sinceDays = { p_start: toIsoDay(BUSINESS_START_DATE), p_end: todayDay };

  const salesFn = "dashboard_sales_range";
  const salesWindows: [string, Record<string, unknown>][] = [
    ["sales", selected],
    ["today", todayWindow],
    ["prev", prevDayWindow],
    ["week", weekWindow],
    ["month", monthWindow],
    ["quarter", quarterWindow],
    ["year", yearWindow],
    ["lastYear", lastYearWindow],
    ["since", sinceWindow],
  ];
  const salesCalls: RpcResult<SalesRangeData>[] = await Promise.all(
    salesWindows.map(([, windowArgs]) =>
      perms.sales
        ? rpc<SalesRangeData>(salesFn, windowArgs)
        : Promise.resolve({ ok: false } as RpcResult<SalesRangeData>),
    ),
  );
  const [salesRes, todayRes, prevRes, weekRes, monthRes, quarterRes, yearRes, lastYearRes, sinceRes] =
    salesCalls;

  const rpcAvailable = perms.sales ? salesRes.ok : false;

  const rest = await Promise.all([
    perms.sales ? rpc<DayPoint[]>("dashboard_sales_by_day", selected) : noData<DayPoint[]>(),
    perms.sales ? rpc<MonthPoint[]>("dashboard_sales_by_month", selected) : noData<MonthPoint[]>(),
    perms.sales ? rpc<CategoryPoint[]>("dashboard_sales_by_category", selected) : noData<CategoryPoint[]>(),
    perms.sales ? rpc<TopProduct[]>("dashboard_top_products", { ...selected, p_limit: 10 }) : noData<TopProduct[]>(),
    perms.sales ? rpc<PaymentsRangeData>("dashboard_payments_range", selected) : noData<PaymentsRangeData>(),
    perms.sales ? rpc<PaymentsRangeData>("dashboard_payments_range", todayWindow) : noData<PaymentsRangeData>(),
    perms.sales ? rpc<PaymentsRangeData>("dashboard_payments_range", monthWindow) : noData<PaymentsRangeData>(),
    perms.sales ? rpc<PaymentsRangeData>("dashboard_payments_range", yearWindow) : noData<PaymentsRangeData>(),
    perms.sales ? rpc<MethodPoint[]>("dashboard_payment_breakdown", selected) : noData<MethodPoint[]>(),
    perms.sales ? rpc<ReceivableRow[]>("dashboard_receivables", {}) : noData<ReceivableRow[]>(),
    perms.sales ? rpc<AlertsData>("dashboard_alerts", {}) : noData<AlertsData>(),
    perms.inventory ? rpc<InventorySummary>("dashboard_inventory_summary", {}) : noData<InventorySummary>(),
    perms.inventory ? serviceRpc<InventoryCategory[]>("dashboard_inventory_by_category", {}) : noData<InventoryCategory[]>(),
    perms.inventory ? serviceRpc<TrendPoint[]>("dashboard_inventory_trend", { p_days: 30 }) : noData<TrendPoint[]>(),
    perms.purchases ? rpc<PurchasesRangeData>("dashboard_purchases_range", invMonth) : noData<PurchasesRangeData>(),
    perms.purchases ? rpc<PurchasesRangeData>("dashboard_purchases_range", invYear) : noData<PurchasesRangeData>(),
    perms.purchases ? rpc<PurchasesMonthPoint[]>("dashboard_purchases_by_month", invYear) : noData<PurchasesMonthPoint[]>(),
    perms.purchases ? rpc<SupplierPoint[]>("dashboard_top_suppliers", { ...invYear, p_limit: 8 }) : noData<SupplierPoint[]>(),
    perms.purchases ? rpc<PayableRow[]>("dashboard_payables", {}) : noData<PayableRow[]>(),
    perms.expenses ? rpc<ExpensesRangeData>("dashboard_expenses_range", { p_start: todayDay, p_end: todayDay }) : noData<ExpensesRangeData>(),
    perms.expenses ? rpc<ExpensesRangeData>("dashboard_expenses_range", invMonth) : noData<ExpensesRangeData>(),
    perms.expenses ? rpc<ExpensesRangeData>("dashboard_expenses_range", invYear) : noData<ExpensesRangeData>(),
    perms.expenses ? rpc<ExpensesRangeData>("dashboard_expenses_range", selected) : noData<ExpensesRangeData>(),
    perms.expenses ? rpc<ExpenseCategoryPoint[]>("dashboard_expenses_by_category", invMonth) : noData<ExpenseCategoryPoint[]>(),
    perms.expenses ? rpc<ExpenseMonthPoint[]>("dashboard_expenses_by_month", invYear) : noData<ExpenseMonthPoint[]>(),
    perms.customers ? rpc<CustomersSummary>("dashboard_customers_summary", { p_month_start: monthRange.start.toISOString(), p_year_start: yearRange.start.toISOString() }) : noData<CustomersSummary>(),
    perms.customers ? rpc<CustomerPoint[]>("dashboard_top_customers", { ...selected, p_limit: 8 }) : noData<CustomerPoint[]>(),
    perms.sales ? rpc<MonthPoint[]>("dashboard_sales_by_month", sinceWindow) : noData<MonthPoint[]>(),
    perms.sales ? rpc<DayPoint[]>("dashboard_sales_by_day", sinceWindow) : noData<DayPoint[]>(),
    perms.sales ? rpc<CategoryPoint[]>("dashboard_sales_by_category", sinceWindow) : noData<CategoryPoint[]>(),
    perms.sales ? rpc<TopProduct[]>("dashboard_top_products", { ...sinceWindow, p_limit: 5 }) : noData<TopProduct[]>(),
    perms.expenses ? rpc<ExpensesRangeData>("dashboard_expenses_range", sinceDays) : noData<ExpensesRangeData>(),
    perms.purchases ? rpc<PurchasesRangeData>("dashboard_purchases_range", sinceDays) : noData<PurchasesRangeData>(),
    perms.customers ? rpc<CustomersSummary>("dashboard_customers_summary", { p_month_start: BUSINESS_START_DATE.toISOString(), p_year_start: BUSINESS_START_DATE.toISOString() }) : noData<CustomersSummary>(),
  ]);

  const [
    byDay, byMonth, byCategory, topProducts,
    payments, paymentsToday, paymentsMonth, paymentsYear, paymentBreakdown, receivables, alerts,
    inventory, inventoryByCategory, inventoryTrend,
    purchasesMonth, purchasesYear, purchasesByMonth, topSuppliers, payables,
    expensesToday, expensesMonth, expensesYear, expensesSelected, expensesByCategory, expensesByMonth,
    customers, topCustomers,
    historyByMonth, historyByDay, historyByCategory, historyTopProducts,
    historyExpenses, historyPurchases, historyCustomers,
  ] = rest;

  return {
    range,
    closedToday,
    rpcAvailable,
    sales: take(salesRes),
    todaySales: take(todayRes),
    prevBusinessDay: take(prevRes),
    week: take(weekRes),
    month: take(monthRes),
    quarter: take(quarterRes),
    year: take(yearRes),
    lastYear: take(lastYearRes),
    byDay: take(byDay),
    byMonth: take(byMonth),
    byCategory: take(byCategory),
    topProducts: take(topProducts),
    payments: take(payments),
    paymentsToday: take(paymentsToday),
    paymentsMonth: take(paymentsMonth),
    paymentsYear: take(paymentsYear),
    paymentBreakdown: take(paymentBreakdown),
    receivables: take(receivables),
    alerts: take(alerts),
    inventory: take(inventory),
    inventoryByCategory: take(inventoryByCategory),
    inventoryTrend: take(inventoryTrend),
    purchasesMonth: take(purchasesMonth),
    purchasesYear: take(purchasesYear),
    purchasesByMonth: take(purchasesByMonth),
    topSuppliers: take(topSuppliers),
    payables: take(payables),
    expensesToday: take(expensesToday),
    expensesMonth: take(expensesMonth),
    expensesYear: take(expensesYear),
    expensesSelected: take(expensesSelected),
    expensesByCategory: take(expensesByCategory),
    expensesByMonth: take(expensesByMonth),
    customers: take(customers),
    topCustomers: take(topCustomers),
    history: {
      sales: take(sinceRes),
      byMonth: take(historyByMonth),
      byDay: take(historyByDay),
      byCategory: take(historyByCategory),
      topProducts: take(historyTopProducts),
      expenses: take(historyExpenses),
      purchases: take(historyPurchases),
      customers: take(historyCustomers),
      businessDays: countBusinessDays(BUSINESS_START_DATE, now),
    },
  };
}

function noData<T>(): RpcResult<T> {
  return { ok: false };
}

// dashboard_inventory_by_category (recursive category CTE over ~20k
// inventory rows) exceeds the statement timeout under the authenticated
// role because RLS applies app.has_permission() per row. It runs with the
// service client, which bypasses RLS. dashboard_inventory_trend likewise
// reconstructs history from the stock ledger and internally calls
// app.business_start_date(), which is not granted to the authenticated
// role (migration 20260817030000 grants app.* helpers to service_role
// only). Both calls therefore run with the service client; server-side
// only, and the UI only renders them when the staff member has
// inventory.read.
async function serviceRpc<T>(name: string, args: Record<string, unknown>): Promise<RpcResult<T>> {
  try {
    const service = createServiceClient();
    const { data, error } = await service.schema("app").rpc(name, args);
    if (error) {
      console.error(
        `[dashboard] RPC ${name} failed: code=${error.code} message=${error.message} details=${error.details ?? ""} hint=${error.hint ?? ""}`,
      );
      return { ok: false };
    }
    return { ok: true, data: data as T };
  } catch (err) {
    console.error(`[dashboard] RPC ${name} threw:`, err);
    return { ok: false };
  }
}

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money",
  card: "Card",
  bank_transfer: "Bank Transfer",
  other: "Other",
};

export function methodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

const compactFormatter = new Intl.NumberFormat("en-GH", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompactGHS(amount: number): string {
  if (!Number.isFinite(amount)) return "—";
  return `GH₵${compactFormatter.format(amount)}`;
}

export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-GH", { maximumFractionDigits: 1 }).format(value);
}

export function percent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(1)}%`;
}

export function bestMonthLabel(points: MonthPoint[] | null): string | null {
  if (!points || points.length === 0) return null;
  const best = points.reduce((max, point) => (point.revenue > max.revenue ? point : max), points[0]);
  if (best.revenue <= 0) return null;
  return `${best.month.slice(0, 7)} (${formatGHS(best.revenue)})`;
}

export function bestDayLabel(points: DayPoint[] | null): string | null {
  if (!points || points.length === 0) return null;
  const best = points.reduce((max, point) => (point.revenue > max.revenue ? point : max), points[0]);
  if (best.revenue <= 0) return null;
  return `${best.day} (${formatGHS(best.revenue)})`;
}

export function bestCategoryLabel(points: CategoryPoint[] | null): string | null {
  if (!points || points.length === 0) return null;
  const best = points.reduce((max, point) => (point.revenue > max.revenue ? point : max), points[0]);
  if (best.revenue <= 0) return null;
  return `${best.category_name} (${formatGHS(best.revenue)})`;
}

export function bestProductLabel(products: TopProduct[] | null): string | null {
  if (!products || products.length === 0) return null;
  const best = products[0];
  if (best.revenue <= 0) return null;
  return `${best.variant_name} (${formatGHS(best.revenue)})`;
}