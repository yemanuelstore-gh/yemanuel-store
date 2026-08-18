import { reportRpc, take } from "@/lib/admin/reporting";
import {
  previousYearRange,
  type CategoryPoint,
  type DashboardRange,
  type DayPoint,
  type MethodPoint,
  type MonthPoint,
  type PaymentsRangeData,
  type SalesRangeData,
  type TopProduct,
} from "@/lib/admin/dashboard";

/**
 * Sales report data layer. Every figure is pre-aggregated server-side by the
 * app.dashboard_* SQL functions (migration 20260817040000), which are
 * SECURITY INVOKER so RLS (sales.read) applies to each aggregate.
 */

export type SalesReportData = {
  range: DashboardRange;
  sales: SalesRangeData | null;
  lastYear: SalesRangeData | null;
  byDay: DayPoint[] | null;
  byMonth: MonthPoint[] | null;
  byCategory: CategoryPoint[] | null;
  topProducts: TopProduct[] | null;
  payments: PaymentsRangeData | null;
  paymentBreakdown: MethodPoint[] | null;
  available: boolean;
};

export async function getSalesReport(range: DashboardRange): Promise<SalesReportData> {
  const args = {
    p_start: range.start.toISOString(),
    p_end: range.end.toISOString(),
  };
  const lastYearWindow = previousYearRange(range);

  const [salesRes, lastYearRes, byDayRes, byMonthRes, byCategoryRes, topProductsRes, paymentsRes, breakdownRes] =
    await Promise.all([
      reportRpc<SalesRangeData>("dashboard_sales_range", args),
      reportRpc<SalesRangeData>("dashboard_sales_range", {
        p_start: lastYearWindow.start.toISOString(),
        p_end: lastYearWindow.end.toISOString(),
      }),
      reportRpc<DayPoint[]>("dashboard_sales_by_day", args),
      reportRpc<MonthPoint[]>("dashboard_sales_by_month", args),
      reportRpc<CategoryPoint[]>("dashboard_sales_by_category", args),
      reportRpc<TopProduct[]>("dashboard_top_products", { ...args, p_limit: 10 }),
      reportRpc<PaymentsRangeData>("dashboard_payments_range", args),
      reportRpc<MethodPoint[]>("dashboard_payment_breakdown", args),
    ]);

  return {
    range,
    sales: take(salesRes),
    lastYear: take(lastYearRes),
    byDay: take(byDayRes),
    byMonth: take(byMonthRes),
    byCategory: take(byCategoryRes),
    topProducts: take(topProductsRes),
    payments: take(paymentsRes),
    paymentBreakdown: take(breakdownRes),
    available: salesRes.ok,
  };
}