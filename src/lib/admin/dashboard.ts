import {
  BUSINESS_START_DATE,
  addDaysUtc,
  endOfDayUtc,
  getBusinessWeekRange,
  getMonthRange,
  getYearRange,
  previousBusinessDay,
  startOfDayUtc,
  isClosedDay,
} from "@/lib/business-calendar";

/**
 * Dashboard data layer.
 *
 * Range resolution supports both the quick presets used by the dashboard
 * (7d / 30d / 90d / 1y) and the business-calendar presets used by the
 * report pages (Today, This Business Week, This Month, … plus custom
 * from/to dates). All calendar math runs in UTC — Ghana has no DST — and
 * every range is clamped to the store's opening date (17 Jan 2022).
 */

export type DashboardRangeKey =
  | "7d"
  | "30d"
  | "90d"
  | "1y"
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
  { key: "week", label: "This Business Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
  { key: "since_opening", label: "Since Opening" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "90d", label: "Last 90 Days" },
  { key: "1y", label: "Last Year" },
];

const QUICK_RANGES: Record<string, { label: string; days: number }> = {
  "7d": { label: "Last 7 Days", days: 7 },
  "30d": { label: "Last 30 Days", days: 30 },
  "90d": { label: "Last 90 Days", days: 90 },
  "1y": { label: "Last Year", days: 365 },
};

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
  const today = startOfDayUtc(new Date());
  const clampedEnd = end > endOfDayUtc(today) ? endOfDayUtc(today) : end;
  if (clampedEnd < clampedStart) {
    return { start: clampedStart, end: endOfDayUtc(clampedStart) };
  }
  return { start: clampedStart, end: clampedEnd };
}

/**
 * Resolves a range key (quick or business-calendar) or custom from/to dates
 * into a concrete DashboardRange. Defaults to "today" for backward
 * compatibility with the report pages.
 */
export function resolveDashboardRange(
  params: { range?: string; from?: string; to?: string },
  now: Date = new Date(),
): DashboardRange {
  const key = params.range ?? "today";
  const today = startOfDayUtc(now);

  const quick = QUICK_RANGES[key];
  if (quick) {
    const start = startOfDayUtc(addDaysUtc(today, -(quick.days - 1)));
    return { key: key as DashboardRangeKey, label: quick.label, start, end: endOfDayUtc(today) };
  }

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
      return { key: "today", label: "Today", start: today, end: endOfDayUtc(today) };
    }
  }
}

/**
 * Returns a range for the same period exactly one year ago.
 */
export function previousYearRange(range: DashboardRange): { start: Date; end: Date } {
  const start = new Date(range.start);
  start.setFullYear(start.getFullYear() - 1);
  const end = new Date(range.end);
  end.setFullYear(end.getFullYear() - 1);
  return { start, end };
}

// ---------------------------------------------------------------------------
// Aggregation row types (mirrors of app.dashboard_* SQL function returns)
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
// Presentation helpers
// ---------------------------------------------------------------------------

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

export function formatCompactGHS(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GHS",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function methodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: "Cash",
    mobile_money: "Mobile Money",
    card: "Card",
    bank_transfer: "Bank Transfer",
    other: "Other",
  };
  return labels[method] || method;
}

/** Day-of-week + day label for chart axes, e.g. "Mon 18". */
export function weekdayLabel(day: string): string {
  const date = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return day;
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
}

/** Whether the store is closed on `date` (Sundays are non-operating). */
export function isStoreClosed(date: Date): boolean {
  return isClosedDay(date);
}

export const STORE_OPENING_DATE = BUSINESS_START_DATE;