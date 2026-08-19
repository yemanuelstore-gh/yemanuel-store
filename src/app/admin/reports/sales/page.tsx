import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { NoAccess } from "@/components/admin/no-access";
import { KpiCard } from "@/components/admin/kpi-card";
import { SalesChart } from "@/components/admin/dashboard/sales-chart";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  resolveDashboardRange,
  previousRange,
  getSalesRange,
  getSalesTrend,
  getTopProducts,
} from "@/lib/admin/dashboard";
import { formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sales Report — Yemanuel Store ERP",
};

const RANGE_KEY = "quarter" as const;

export default async function SalesReportPage() {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return (
      <PageContainer>
        <PageHeader title="Sales Report" breadcrumb={[{ label: "Reports" }, { label: "Sales" }]} />
        <NoAccess module="sales reports" />
      </PageContainer>
    );
  }

  const client = await createClient();
  const range = resolveDashboardRange({ range: RANGE_KEY });
  const previous = previousRange(range);
  const [sales, previousSales, trend, topProducts] = await Promise.all([
    getSalesRange(client, range),
    getSalesRange(client, previous),
    getSalesTrend(client, range),
    getTopProducts(client, range, 10),
  ]);

  const salesDelta =
    sales != null && previousSales != null
      ? previousSales.revenue > 0
        ? ((sales.revenue - previousSales.revenue) / previousSales.revenue) * 100
        : null
      : null;

  return (
    <PageContainer>
      <PageHeader
        title="Sales Report"
        description={`Sales performance for ${range.label.toLowerCase()} against the previous ${range.label.toLowerCase()}.`}
        breadcrumb={[{ label: "Reports" }, { label: "Sales" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={sales != null ? formatGHS(sales.revenue) : "—"}
          icon="payments"
          trend={salesDelta != null ? { value: salesDelta } : undefined}
        />
        <KpiCard
          label="Gross Profit"
          value={sales != null ? formatGHS(sales.gross_profit) : "—"}
          icon="sparkle"
        />
        <KpiCard
          label="Orders"
          value={sales != null ? sales.order_count.toLocaleString() : "—"}
          icon="orders"
        />
        <KpiCard
          label="Average Order Value"
          value={sales != null ? formatGHS(sales.average_order_value) : "—"}
          icon="reports"
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-erp-border px-4 py-3">
          <h2 className="text-sm font-semibold text-erp-text">
            Daily Revenue &amp; Gross Profit
          </h2>
          <span className="text-xs text-erp-text-muted">{range.label}</span>
        </div>
        <div className="px-4 py-4">
          <SalesChart
            points={trend ?? []}
            monthly={range.days > 90}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-erp-border px-4 py-3">
          <h2 className="text-sm font-semibold text-erp-text">Top Selling Products</h2>
        </div>
        {!topProducts || topProducts.length === 0 ? (
          <p className="px-4 py-6 text-sm text-erp-text-secondary">
            No product sales in this period.
          </p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Product</TH>
                <TH>SKU</TH>
                <TH className="text-right">Units</TH>
                <TH className="text-right">Revenue</TH>
              </TR>
            </THead>
            <TBody>
              {topProducts.map((product) => (
                <TR key={`${product.product_name}-${product.sku}`}>
                  <TD className="max-w-72">
                    <span className="block truncate font-medium text-erp-text">
                      {product.product_name}
                    </span>
                    {product.variant_name && (
                      <span className="block truncate text-[11px] text-erp-text-muted">
                        {product.variant_name}
                      </span>
                    )}
                  </TD>
                  <TD className="font-mono text-[12px] text-erp-text-secondary">
                    {product.sku ?? "—"}
                  </TD>
                  <TD className="text-right tabular-nums text-erp-text-secondary">
                    {product.units.toLocaleString()}
                  </TD>
                  <TD className="text-right font-semibold tabular-nums text-erp-text">
                    {formatGHS(product.revenue)}
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </Card>
    </PageContainer>
  );
}