import { isoDay, reportRpc, take } from "@/lib/admin/reporting";
import { getExpenses, type ExpenseRow } from "@/lib/admin/expenses";
import type {
  DashboardRange,
  ExpenseCategoryPoint,
  ExpenseMonthPoint,
  ExpensesRangeData,
} from "@/lib/admin/dashboard";

/**
 * Expenses report data layer. Totals, category splits and monthly series come
 * from the existing app.dashboard_expenses_* functions; the expense list is
 * served by the shared expense data layer.
 */

export type ExpenseReportData = {
  range: DashboardRange;
  total: ExpensesRangeData | null;
  byCategory: ExpenseCategoryPoint[] | null;
  byMonth: ExpenseMonthPoint[] | null;
  rows: ExpenseRow[];
  rowsTotal: number;
  available: boolean;
};

export async function getExpenseReport(
  range: DashboardRange,
  {
    q,
    categoryId,
    page = 1,
    pageSize = 25,
  }: {
    q?: string;
    categoryId?: string;
    page?: number;
    pageSize?: number;
  },
): Promise<ExpenseReportData> {
  const args = { p_start: isoDay(range.start), p_end: isoDay(range.end) };

  const [totalRes, byCategoryRes, byMonthRes, list] = await Promise.all([
    reportRpc<ExpensesRangeData>("dashboard_expenses_range", args),
    reportRpc<ExpenseCategoryPoint[]>("dashboard_expenses_by_category", args),
    reportRpc<ExpenseMonthPoint[]>("dashboard_expenses_by_month", args),
    getExpenses({ q, categoryId, page, pageSize }),
  ]);

  return {
    range,
    total: take(totalRes),
    byCategory: take(byCategoryRes),
    byMonth: take(byMonthRes),
    rows: list.expenses,
    rowsTotal: list.total,
    available: totalRes.ok,
  };
}