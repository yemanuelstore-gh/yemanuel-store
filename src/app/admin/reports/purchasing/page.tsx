import type { Metadata } from "next";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCardSection, AdminTable, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { DateRangePicker } from "@/components/admin/dashboard/date-range-picker";
import { BarChart, HBarList } from "@/components/admin/dashboard/charts";
import { Panel, PanelGrid } from "@/components/admin/dashboard/section";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatCompactGHS, formatNumber, resolveDashboardRange } from "@/lib/admin/dashboard";
import { getPurchasingReport } from "@/lib/admin/report-purchasing";
import { monthLabel } from "@/lib/admin/reporting";
import { formatGHS } from "@/lib/format";
import { purchaseOrderStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Purchasing Reports — Yemanuel Store Admin",
};

export default async function AdminPurchasingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the purchases.read permission required for this report." />
    );
  }

  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const data = await getPurchasingReport(range);
  const purchases = data.purchases;

  const openPoCount = data.poStatusCounts
    .filter((row) => row.status !== "cancelled" && row.status !== "received")
    .reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Purchasing Reports"
        description={`Purchasing activity for ${range.label} · receipt value is landed cost of goods actually received`}
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
          ). Apply the migration to unlock this report. Purchase order counts
          below still work.
        </div>
      )}

      {purchases && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Receipts value"
              value={formatGHS(purchases.receipts_value)}
              tone="positive"
            />
            <KpiCard label="Goods receipts" value={formatNumber(purchases.receipt_count)} />
            <KpiCard
              label="Open purchase orders"
              value={formatNumber(openPoCount)}
              note="Draft, sent or partially received"
              tone={openPoCount > 0 ? "gold" : "default"}
            />
            <KpiCard
              label="Supplier invoices"
              value={formatGHS(purchases.invoices_value)}
              note={`${purchases.invoice_count} invoices in range`}
            />
            <KpiCard
              label="Outstanding payables"
              value={formatGHS(
                (data.payables ?? []).reduce((sum, row) => sum + row.outstanding, 0),
              )}
              note="Current position, all time"
              tone="danger"
            />
          </div>

          <PanelGrid>
            <Panel title="Monthly receipts">
              <BarChart
                data={(data.byMonth ?? []).map((point) => ({
                  label: monthLabel(point.month),
                  value: point.receipts_value,
                }))}
                formatValue={formatCompactGHS}
                color="#0b1f33"
              />
            </Panel>
            <Panel title="Top suppliers by received value">
              <HBarList
                data={(data.topSuppliers ?? []).map((row) => ({
                  label: row.supplier_name,
                  value: row.receipts_value,
                }))}
                formatValue={formatCompactGHS}
              />
            </Panel>
          </PanelGrid>

          <div className="grid gap-5 xl:grid-cols-2">
            <AdminCardSection title="Purchase order pipeline">
              <AdminTable
                head={
                  <>
                    <Th>Status</Th>
                    <Th className="text-right">Count</Th>
                  </>
                }
              >
                {data.poStatusCounts.map((row) => (
                  <tr key={row.status} className="transition-colors hover:bg-navy-soft/40">
                    <Td>
                      <AdminBadge tone={purchaseOrderStatusTone(row.status)}>
                        {statusLabel(row.status)}
                      </AdminBadge>
                    </Td>
                    <Td className="text-right font-medium">{row.count}</Td>
                  </tr>
                ))}
              </AdminTable>
            </AdminCardSection>

            <AdminCardSection title="Top suppliers">
              <AdminTable
                head={
                  <>
                    <Th>Supplier</Th>
                    <Th className="text-right">Receipts</Th>
                    <Th className="text-right">Received value</Th>
                  </>
                }
              >
                {(data.topSuppliers ?? []).map((row) => (
                  <tr key={row.supplier_name} className="transition-colors hover:bg-navy-soft/40">
                    <Td className="font-medium">{row.supplier_name}</Td>
                    <Td className="text-right text-ink-soft">{row.receipt_count}</Td>
                    <Td className="whitespace-nowrap text-right font-medium">
                      {formatGHS(row.receipts_value)}
                    </Td>
                  </tr>
                ))}
                {(data.topSuppliers ?? []).length === 0 && (
                  <tr>
                    <Td colSpan={3} className="text-ink-faint">
                      No receipts in this range.
                    </Td>
                  </tr>
                )}
              </AdminTable>
            </AdminCardSection>
          </div>

          <AdminCardSection title="Outstanding payables by supplier">
            <AdminTable
              head={
                <>
                  <Th>Supplier</Th>
                  <Th className="text-right">Invoices</Th>
                  <Th className="text-right">Outstanding</Th>
                </>
              }
            >
              {(data.payables ?? []).slice(0, 10).map((row) => (
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
        </>
      )}
    </div>
  );
}