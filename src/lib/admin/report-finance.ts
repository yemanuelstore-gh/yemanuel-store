import { createClient } from "@/lib/supabase/server";
import { fetchAllPaged, isoDay, reportRpc, take } from "@/lib/admin/reporting";
import {
  type DashboardRange,
  type ExpenseCategoryPoint,
  type ExpenseMonthPoint,
  type ExpensesRangeData,
  type MethodPoint,
  type MonthPoint,
  type PaymentsRangeData,
  type PayableRow,
  type ReceivableRow,
  type SalesRangeData,
} from "@/lib/admin/dashboard";

/**
 * Financial report data layer. Composes the existing app.dashboard_* sales,
 * expense and payment aggregates into a single management view, plus a
 * purchase-payment total that has no server-side aggregate (computed exactly
 * with paged fetches in the application).
 */

export type FinancialReportData = {
  range: DashboardRange;
  sales: SalesRangeData | null;
  salesByMonth: MonthPoint[] | null;
  expenses: ExpensesRangeData | null;
  expensesByCategory: ExpenseCategoryPoint[] | null;
  expensesByMonth: ExpenseMonthPoint[] | null;
  payments: PaymentsRangeData | null;
  paymentBreakdown: MethodPoint[] | null;
  purchasePaymentsTotal: number | null;
  receivables: ReceivableRow[] | null;
  payables: PayableRow[] | null;
  available: boolean;
};

export async function getFinancialReport(range: DashboardRange): Promise<FinancialReportData> {
  const client = await createClient();
  const tsArgs = {
    p_start: range.start.toISOString(),
    p_end: range.end.toISOString(),
  };
  const dayArgs = { p_start: isoDay(range.start), p_end: isoDay(range.end) };

  const [salesRes, salesByMonthRes, expensesRes, expensesByCategoryRes, expensesByMonthRes, paymentsRes, breakdownRes, receivablesRes, payablesRes, purchasePayments] =
    await Promise.all([
      reportRpc<SalesRangeData>("dashboard_sales_range", tsArgs),
      reportRpc<MonthPoint[]>("dashboard_sales_by_month", tsArgs),
      reportRpc<ExpensesRangeData>("dashboard_expenses_range", dayArgs),
      reportRpc<ExpenseCategoryPoint[]>("dashboard_expenses_by_category", dayArgs),
      reportRpc<ExpenseMonthPoint[]>("dashboard_expenses_by_month", dayArgs),
      reportRpc<PaymentsRangeData>("dashboard_payments_range", tsArgs),
      reportRpc<MethodPoint[]>("dashboard_payment_breakdown", tsArgs),
      reportRpc<ReceivableRow[]>("dashboard_receivables", {}),
      reportRpc<PayableRow[]>("dashboard_payables", {}),
      fetchAllPaged<{ amount: number }>((from, to) =>
        client
          .from("purchase_payments")
          .select("amount")
          .gte("payment_date", dayArgs.p_start)
          .lte("payment_date", dayArgs.p_end)
          .range(from, to),
      ),
    ]);

  const purchasePaymentsTotal = purchasePayments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0,
  );

  return {
    range,
    sales: take(salesRes),
    salesByMonth: take(salesByMonthRes),
    expenses: take(expensesRes),
    expensesByCategory: take(expensesByCategoryRes),
    expensesByMonth: take(expensesByMonthRes),
    payments: take(paymentsRes),
    paymentBreakdown: take(breakdownRes),
    purchasePaymentsTotal,
    receivables: take(receivablesRes),
    payables: take(payablesRes),
    available: salesRes.ok,
  };
}