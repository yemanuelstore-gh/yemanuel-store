import type { Metadata } from "next";
import { AdminCardSection, AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { DateRangePicker } from "@/components/admin/dashboard/date-range-picker";
import { BarChart, HBarList, ShareDonut } from "@/components/admin/dashboard/charts";
import { Panel, PanelGrid } from "@/components/admin/dashboard/section";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import {
  formatCompactGHS,
  methodLabel,
  resolveDashboardRange,
} from "@/lib/admin/dashboard";
import { getFinancialReport } from "@/lib/admin/report-finance";
import { formatDateLabel, monthKey, monthLabel } from "@/lib/admin/reporting";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Financial Reports — Yemanuel Store Admin",
};

export default async function AdminFinancialReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }

  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const data = await getFinancialReport(range);

  const sales = data.sales;
  const expenses = data.expenses;
  const grossProfit = sales?.gross_profit ?? 0;
  const operatingExpenses = expenses?.total ?? 0;
  const netOperating = grossProfit - operatingExpenses;
  const purchasePayments = data.purchasePaymentsTotal ?? 0;
  const cashIn = data.payments?.collected_total ?? 0;
  const cashOut = operatingExpenses + purchasePayments;
  const netCash = cashIn - cashOut;

  const expenseByMonth = new Map(
    (data.expensesByMonth ?? []).map((point) => [monthKey(point.month), point]),
  );
  const months = new Set([
    ...(data.salesByMonth ?? []).map((point) => monthKey(point.month)),
    ...expenseByMonth.keys(),
  ]);
  const monthlyRows = Array.from(months)
    .sort()
    .map((month) => {
      const sale = (data.salesByMonth ?? []).find((point) => monthKey(point.month) === month);
      const expense = expenseByMonth.get(month);
      return {
        month,
        revenue: sale?.revenue ?? 0,
        grossProfit: sale?.gross_profit ?? 0,
        expenses: expense?.total ?? 0,
        net: (sale?.gross_profit ?? 0) - (expense?.total ?? 0),
      };
    });

  const canReadExpenses = hasPermission(session, PERMISSIONS.expenses.read);
  const canReadPurchases = hasPermission(session, PERMISSIONS.purchases.read);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Financial Reports"
        description={`Profit, cash and balance position for ${range.label} · all figures in GH₵`}
        actions={<DateRangePicker current={range.key} customFrom={range.customFrom} customTo={range.customTo} />}
      />

      {!data.available && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs leading-5 text-danger">
          <strong>Aggregations are not available yet.</strong> This report reads
          pre-aggregated figures from SQL functions in the{" "}
          <code className="mx-1 rounded bg-white/60 px-1">app</code> schema
          (migration{" "}
          <code className="mx-1 rounded bg-white/60 px-1">
            20260817040000_dashboard_aggregations.sql
          </code>
          ). Apply the migration to unlock this report.
        </div>
      )}

      {sales && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard label="Revenue" value={formatGHS(sales.revenue)} tone="positive" />
            <KpiCard label="Gross profit" value={formatGHS(grossProfit)} note={`${sales.gross_margin}% margin`} />
            <KpiCard
              label="Operating expenses"
              value={formatGHS(operatingExpenses)}
              note={canReadExpenses ? `${expenses?.expense_count ?? 0} expenses` : undefined}
            />
            <KpiCard
              label="Net operating result"
              value={formatGHS(netOperating)}
              note="Gross profit less operating expenses"
              tone={netOperating >= 0 ? "positive" : "danger"}
            />
            <KpiCard
              label="Net cash flow"
              value={formatGHS(netCash)}
              note="Collections less expenses & purchase payments"
              tone={netCash >= 0 ? "positive" : "danger"}
            />
          </div>

          <PanelGrid>
            <Panel title="Profit & loss summary">
              <div className="divide-y divide-line">
                <DataRow label="Revenue (non-cancelled orders)" value={formatGHS(sales.revenue)} />
                <DataRow label="Cost of goods sold" value={formatGHS(sales.cogs)} />
                <DataRow label="Gross profit" value={formatGHS(grossProfit)} />
                <DataRow label="Operating expenses" value={formatGHS(operatingExpenses)} />
                <DataRow
                  label="Net operating result"
                  value={
                    <span className={netOperating >= 0 ? "text-navy" : "text-danger"}>
                      {formatGHS(netOperating)}
                    </span>
                  }
                />
              </div>
            </Panel>
            <Panel title="Cash flow summary">
              <div className="divide-y divide-line">
                <DataRow label="Collections (paid / authorized)" value={formatGHS(cashIn)} />
                <DataRow
                  label="Refunds"
                  value={formatGHS(data.payments?.refunds_total ?? 0)}
                />
                <DataRow label="Expenses paid" value={formatGHS(operatingExpenses)} />
                <DataRow label="Supplier payments" value={formatGHS(purchasePayments)} />
                <DataRow
                  label="Net cash flow"
                  value={
                    <span className={netCash >= 0 ? "text-navy" : "text-danger"}>
                      {formatGHS(netCash)}
                    </span>
                  }
                />
              </div>
            </Panel>
          </PanelGrid>

          <PanelGrid>
            <Panel title="Revenue by month">
              <BarChart
                data={(data.salesByMonth ?? []).map((point) => ({
                  label: monthLabel(monthKey(point.month)),
                  value: point.revenue,
                }))}
                formatValue={formatCompactGHS}
                color="#c9a227"
              />
            </Panel>
            <Panel title="Expenses by month">
              <BarChart
                data={(data.expensesByMonth ?? []).map((point) => ({
                  label: monthLabel(monthKey(point.month)),
                  value: point.total,
                }))}
                formatValue={formatCompactGHS}
                color="#0b1f33"
              />
            </Panel>
          </PanelGrid>

          {canReadExpenses && (
            <PanelGrid>
              <Panel title="Expenses by category">
                <HBarList
                  data={(data.expensesByCategory ?? []).map((point) => ({
                    label: point.category_name,
                    value: point.total,
                  }))}
                  formatValue={formatCompactGHS}
                />
              </Panel>
              <Panel title="Payment methods">
                <ShareDonut
                  data={(data.paymentBreakdown ?? []).map((point) => ({
                    label: methodLabel(point.method),
                    value: point.collected,
                  }))}
                  formatValue={formatCompactGHS}
                />
              </Panel>
            </PanelGrid>
          )}

          <AdminCardSection title="Monthly summary">
            <AdminTable
              head={
                <>
                  <Th>Month</Th>
                  <Th className="text-right">Revenue</Th>
                  <Th className="text-right">Gross profit</Th>
                  <Th className="text-right">Expenses</Th>
                  <Th className="text-right">Net</Th>
                </>
              }
            >
              {monthlyRows.map((row) => (
                <tr key={row.month} className="transition-colors hover:bg-navy-soft/40">
                  <Td className="font-medium">{monthLabel(row.month)}</Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft">
                    {formatGHS(row.revenue)}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft">
                    {formatGHS(row.grossProfit)}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft">
                    {formatGHS(row.expenses)}
                  </Td>
                  <Td
                    className={`whitespace-nowrap text-right font-medium ${
                      row.net >= 0 ? "text-navy" : "text-danger"
                    }`}
                  >
                    {formatGHS(row.net)}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          </AdminCardSection>

          <div className="grid gap-5 xl:grid-cols-2">
            <AdminCardSection title="Receivables by customer">
              <AdminTable
                head={
                  <>
                    <Th>Customer</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Outstanding</Th>
                  </>
                }
              >
                {(data.receivables ?? []).slice(0, 8).map((row) => (
                  <tr key={row.customer_name} className="transition-colors hover:bg-navy-soft/40">
                    <Td className="font-medium">{row.customer_name}</Td>
                    <Td className="text-right text-ink-soft">{row.order_count}</Td>
                    <Td className="whitespace-nowrap text-right font-semibold text-danger">
                      {formatGHS(row.outstanding)}
                    </Td>
                  </tr>
                ))}
                {(data.receivables ?? []).length === 0 && (
                  <tr>
                    <Td colSpan={3} className="text-ink-faint">
                      No outstanding receivables.
                    </Td>
                  </tr>
                )}
              </AdminTable>
            </AdminCardSection>

            {canReadPurchases && (
              <AdminCardSection title="Payables by supplier">
                <AdminTable
                  head={
                    <>
                      <Th>Supplier</Th>
                      <Th className="text-right">Invoices</Th>
                      <Th className="text-right">Outstanding</Th>
                    </>
                  }
                >
                  {(data.payables ?? []).slice(0, 8).map((row) => (
                    <tr key={row.supplier_name} className="transition-colors hover:bg-navy-soft/40">
                      <Td className="font-medium">{row.supplier_name}</Td>
                      <Td className="text-right text-ink-soft">{row.invoice_count}</Td>
                      <Td className="whitespace-nowrap text-right font-semibold text-danger">
                        {formatGHS(row.outstanding)}
                      </Td>
                    </tr>
                  ))}
                  {(data.payables ?? []).length === 0 && (
                    <tr>
                      <Td colSpan={3} className="text-ink-faint">
                        No outstanding payables.
                      </Td>
                    </tr>
                  )}
                </AdminTable>
              </AdminCardSection>
            )}
          </div>

          <p className="text-[11px] leading-4 text-ink-faint">
            Position as at {formatDateLabel(new Date().toISOString())}. Net
            operating result is gross profit less operating expenses; it does
            not include depreciation or taxes. Receivables and payables are
            current positions, not range figures.
          </p>
        </>
      )}
    </div>
  );
}