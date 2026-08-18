import type { Metadata } from "next";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCardSection, AdminTable, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { BarChart, HBarList } from "@/components/admin/dashboard/charts";
import { Panel, PanelGrid } from "@/components/admin/dashboard/section";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatCompactGHS, formatNumber } from "@/lib/admin/dashboard";
import { getInventoryReport } from "@/lib/admin/report-inventory";
import { shortDayLabel } from "@/lib/admin/reporting";
import { formatGHS } from "@/lib/format";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Inventory Reports — Yemanuel Store Admin",
};

export default async function AdminInventoryReportPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the inventory.read permission required for this report." />
    );
  }

  const data = await getInventoryReport();
  const summary = data.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Inventory Reports"
        description="Current stock position, valuation and movement trend · inventory value is quantity on hand × average cost"
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

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiCard
              label="Inventory value"
              value={formatGHS(summary.total_value)}
              tone="positive"
            />
            <KpiCard label="Total units" value={formatNumber(summary.total_units)} />
            <KpiCard label="SKUs" value={formatNumber(summary.sku_count)} note={`${summary.item_count} location lines`} />
            <KpiCard
              label="Low stock"
              value={formatNumber(summary.low_stock_count)}
              tone={summary.low_stock_count > 0 ? "gold" : "default"}
            />
            <KpiCard
              label="Out of stock"
              value={formatNumber(summary.out_of_stock_count)}
              tone={summary.out_of_stock_count > 0 ? "danger" : "default"}
            />
          </div>

          <PanelGrid>
            <Panel title="Valuation trend · last 60 days">
              <BarChart
                data={(data.trend ?? []).map((point) => ({
                  label: shortDayLabel(point.day),
                  value: point.value,
                }))}
                formatValue={formatCompactGHS}
                color="#0b1f33"
              />
            </Panel>
            <Panel title="Value by category">
              <HBarList
                data={(data.valuation?.byCategory ?? []).map((row) => ({
                  label: row.categoryName,
                  value: row.value,
                }))}
                formatValue={formatCompactGHS}
              />
            </Panel>
          </PanelGrid>

          <PanelGrid>
            <Panel title="Value by location">
              <HBarList
                data={(data.valuation?.byLocation ?? []).map((row) => ({
                  label: row.locationName,
                  value: row.value,
                }))}
                formatValue={formatCompactGHS}
              />
            </Panel>
            <Panel title="Low stock SKUs">
              {data.lowStockRows.length === 0 ? (
                <p className="text-[11px] leading-5 text-ink-faint">
                  No SKUs are low on stock or out of stock.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.lowStockRows.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 text-[11px]"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-medium text-ink">{row.variantName}</span>
                        <span className="ml-1.5 text-ink-faint">{row.sku}</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap tabular-nums">
                        <span className="font-semibold text-ink">
                          {formatNumber(row.available)}
                        </span>
                        <span className="text-ink-faint"> on hand</span>
                        {row.shortage > 0 && (
                          <span className="ml-1.5 text-danger">short {formatNumber(row.shortage)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </PanelGrid>

          <AdminCardSection title="Locations">
            <AdminTable
              head={
                <>
                  <Th>Location</Th>
                  <Th>Type</Th>
                  <Th>Status</Th>
                  <Th className="text-right">SKUs</Th>
                  <Th className="text-right">Units</Th>
                  <Th className="text-right">Value</Th>
                  <Th className="text-right">Low</Th>
                  <Th className="text-right">Out</Th>
                </>
              }
            >
              {data.locations.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-navy-soft/40">
                  <Td className="font-medium">{row.name}</Td>
                  <Td className="text-ink-soft">{statusLabel(row.locationType)}</Td>
                  <Td>
                    <AdminBadge tone={entityStatusTone(row.status)}>
                      {statusLabel(row.status)}
                    </AdminBadge>
                  </Td>
                  <Td className="text-right text-ink-soft">{row.skuCount}</Td>
                  <Td className="text-right text-ink-soft">{formatNumber(row.units)}</Td>
                  <Td className="whitespace-nowrap text-right font-medium">
                    {formatGHS(row.inventoryValue)}
                  </Td>
                  <Td className="text-right text-ink-soft">{row.lowStockCount}</Td>
                  <Td className="text-right text-ink-soft">{row.outOfStockCount}</Td>
                </tr>
              ))}
            </AdminTable>
          </AdminCardSection>
        </>
      )}
    </div>
  );
}