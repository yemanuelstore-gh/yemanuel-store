import type { Metadata } from "next";
import { AdminCardSection, AdminTable, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { DateRangePicker } from "@/components/admin/dashboard/date-range-picker";
import { BarChart, HBarList, ShareDonut } from "@/components/admin/dashboard/charts";
import { Panel, PanelGrid } from "@/components/admin/dashboard/section";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { resolveDashboardRange, formatCompactGHS, formatNumber, methodLabel, percent } from "@/lib/admin/dashboard";
import { getSalesReport } from "@/lib/admin/report-sales";
import { monthLabel, shortDayLabel } from "@/lib/admin/reporting";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Sales Reports — Yemanuel Store Admin",
};

export default async function AdminSalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the sales.read permission required for this report." />
    );
  }

  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const data = await getSalesReport(range);
  const sales = data.sales;

  const yoyNote = (() => {
    if (!sales || !data.lastYear || data.lastYear.revenue <= 0) return null;
    const delta = ((sales.revenue - data.lastYear.revenue) / data.lastYear.revenue) * 100;
    return `YoY ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% vs same period last year`;
  })();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales Reports"
        description={`Sales performance for ${range.label} · all figures in GH₵`}
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
          ). Apply the migration to unlock this report. No numbers are
          fabricated while this is pending.
        </div>
      )}

      {sales && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Revenue"
              value={formatGHS(sales.revenue)}
              note={yoyNote ?? undefined}
              tone={sales.revenue > 0 ? "positive" : "default"}
            />
            <KpiCard label="Orders" value={formatNumber(sales.order_count)} note={`${sales.cancelled_orders} cancelled`} />
            <KpiCard label="Items sold" value={formatNumber(sales.units_sold)} />
            <KpiCard label="Avg order value" value={formatGHS(sales.average_order_value)} />
            <KpiCard
              label="Gross profit"
              value={formatGHS(sales.gross_profit)}
              note={`${percent(sales.gross_margin)} margin`}
            />
          </div>

          <PanelGrid>
            <Panel title={`Daily sales trend · ${range.label}`}>
              <BarChart
                data={(data.byDay ?? []).map((point) => ({
                  label: shortDayLabel(point.day),
                  value: point.revenue,
                }))}
                formatValue={formatCompactGHS}
                color="#0b1f33"
              />
            </Panel>
            <Panel title="Sales by category">
              <HBarList
                data={(data.byCategory ?? []).map((point) => ({
                  label: point.category_name,
                  value: point.revenue,
                }))}
                formatValue={formatCompactGHS}
              />
            </Panel>
          </PanelGrid>

          <PanelGrid>
            <Panel title="Payment methods">
              <ShareDonut
                data={(data.paymentBreakdown ?? []).map((point) => ({
                  label: methodLabel(point.method),
                  value: point.collected,
                }))}
                formatValue={formatCompactGHS}
              />
            </Panel>
            <Panel title="Top products by revenue">
              <HBarList
                data={(data.topProducts ?? []).map((product) => ({
                  label: product.variant_name,
                  value: product.revenue,
                }))}
                formatValue={formatCompactGHS}
              />
            </Panel>
          </PanelGrid>

          <div className="grid gap-5 xl:grid-cols-2">
            <AdminCardSection title="Sales by month">
              <AdminTable
                head={
                  <>
                    <Th>Month</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Revenue</Th>
                    <Th className="text-right">Gross profit</Th>
                  </>
                }
              >
                {(data.byMonth ?? []).map((point) => (
                  <tr key={point.month} className="transition-colors hover:bg-navy-soft/40">
                    <Td className="font-medium">{monthLabel(point.month)}</Td>
                    <Td className="text-right text-ink-soft">{point.order_count}</Td>
                    <Td className="whitespace-nowrap text-right font-medium">
                      {formatGHS(point.revenue)}
                    </Td>
                    <Td className="whitespace-nowrap text-right text-ink-soft">
                      {formatGHS(point.gross_profit)}
                    </Td>
                  </tr>
                ))}
              </AdminTable>
            </AdminCardSection>

            <AdminCardSection title="Top products">
              <AdminTable
                head={
                  <>
                    <Th>Variant</Th>
                    <Th>SKU</Th>
                    <Th className="text-right">Units</Th>
                    <Th className="text-right">Revenue</Th>
                  </>
                }
              >
                {(data.topProducts ?? []).map((product) => (
                  <tr key={product.variant_name + product.sku} className="transition-colors hover:bg-navy-soft/40">
                    <Td className="font-medium">{product.variant_name}</Td>
                    <Td className="text-ink-soft">{product.sku}</Td>
                    <Td className="text-right text-ink-soft">{formatNumber(product.units)}</Td>
                    <Td className="whitespace-nowrap text-right font-medium">
                      {formatGHS(product.revenue)}
                    </Td>
                  </tr>
                ))}
              </AdminTable>
            </AdminCardSection>
          </div>

          {data.payments && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <KpiCard
                label="Collected"
                value={formatGHS(data.payments.collected_total)}
                note={`${data.payments.collected_count} payments`}
                tone="positive"
              />
              <KpiCard
                label="Pending"
                value={formatGHS(data.payments.pending_amount)}
                note={`${data.payments.pending_count} payments`}
                tone="gold"
              />
              <KpiCard
                label="Refunds"
                value={formatGHS(data.payments.refunds_total)}
                note={`${data.payments.refunds_count} refunds`}
                tone="danger"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}