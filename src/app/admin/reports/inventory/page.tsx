import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { NoAccess } from "@/components/admin/no-access";
import { KpiCard } from "@/components/admin/kpi-card";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { getInventorySummary } from "@/lib/admin/dashboard";
import { getStockByLocation, getStockByVariant } from "@/lib/admin/inventory";
import { formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inventory Report — Yemanuel ERP",
};

export default async function InventoryReportPage() {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return (
      <PageContainer>
        <PageHeader
          title="Inventory Report"
          breadcrumb={[{ label: "Reports" }, { label: "Inventory" }]}
        />
        <NoAccess module="inventory reports" />
      </PageContainer>
    );
  }

  const client = await createClient();
  const [summary, stockByLocation, stockByVariant] = await Promise.all([
    getInventorySummary(client),
    getStockByLocation(client),
    getStockByVariant(client, 10),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Inventory Report"
        description="Current stock position across all locations."
        breadcrumb={[{ label: "Reports" }, { label: "Inventory" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Stock Value"
          value={summary != null ? formatGHS(summary.total_value) : "—"}
          icon="stock"
        />
        <KpiCard
          label="Units on Hand"
          value={summary != null ? summary.total_units.toLocaleString() : "—"}
          icon="variants"
        />
        <KpiCard
          label="Low Stock"
          value={summary != null ? summary.low_stock_count.toLocaleString() : "—"}
          icon="alert"
        />
        <KpiCard
          label="Out of Stock"
          value={summary != null ? summary.out_of_stock_count.toLocaleString() : "—"}
          icon="cancel"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-erp-border px-4 py-3">
            <h2 className="text-sm font-semibold text-erp-text">Stock by Location</h2>
          </div>
          {stockByLocation.length === 0 ? (
            <p className="px-4 py-6 text-sm text-erp-text-secondary">
              No inventory recorded at any location yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Location</TH>
                  <TH className="text-right">SKUs</TH>
                  <TH className="text-right">Units</TH>
                  <TH className="text-right">Value</TH>
                </TR>
              </THead>
              <TBody>
                {stockByLocation.map((row) => (
                  <TR key={row.location_id}>
                    <TD className="font-medium text-erp-text">{row.location_name}</TD>
                    <TD className="text-right tabular-nums text-erp-text-secondary">
                      {row.sku_count.toLocaleString()}
                    </TD>
                    <TD className="text-right tabular-nums text-erp-text-secondary">
                      {row.units.toLocaleString()}
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {formatGHS(row.value)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-erp-border px-4 py-3">
            <h2 className="text-sm font-semibold text-erp-text">
              Top SKUs by Stock Value
            </h2>
          </div>
          {stockByVariant.length === 0 ? (
            <p className="px-4 py-6 text-sm text-erp-text-secondary">
              No inventory recorded yet.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>SKU</TH>
                  <TH className="text-right">Units</TH>
                  <TH className="text-right">Value</TH>
                </TR>
              </THead>
              <TBody>
                {stockByVariant.map((row) => (
                  <TR key={row.variant_id}>
                    <TD className="max-w-56">
                      <span className="block truncate font-medium text-erp-text">
                        {row.product_name ?? row.sku ?? "—"}
                      </span>
                      {row.sku && (
                        <span className="block truncate font-mono text-[11px] text-erp-text-muted">
                          {row.sku}
                        </span>
                      )}
                    </TD>
                    <TD className="text-right tabular-nums text-erp-text-secondary">
                      {row.units.toLocaleString()}
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {formatGHS(row.value)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}