import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  AdminCardSection,
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { DateRangePicker } from "@/components/admin/dashboard/date-range-picker";
import { HBarList } from "@/components/admin/dashboard/charts";
import { Panel, PanelGrid } from "@/components/admin/dashboard/section";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatCompactGHS, formatNumber, resolveDashboardRange } from "@/lib/admin/dashboard";
import { getProductReport } from "@/lib/admin/report-products";
import { formatGHS } from "@/lib/format";
import { productStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Product Reports — Yemanuel Store Admin",
};

export default async function AdminProductReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; page?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the products.read permission required for this report." />
    );
  }
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the sales.read permission required for the sales figures in this report." />
    );
  }

  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;
  const data = await getProductReport(range, page, pageSize);

  const productsWithSales = data.rows.filter((row) => row.revenue > 0).length;
  const totalUnitsSold = data.rows.reduce((sum, row) => sum + row.unitsSold, 0);
  const totalRevenue = data.rows.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Product Reports"
        description={`Product performance for ${range.label} · sales figures include only non-cancelled orders`}
        actions={<DateRangePicker current={range.key} customFrom={range.customFrom} customTo={range.customTo} />}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Products listed" value={formatNumber(data.total)} note="Across all statuses" />
        <KpiCard
          label="Revenue (this page)"
          value={formatGHS(totalRevenue)}
          note={`${productsWithSales} of ${data.rows.length} listed sold this page`}
          tone="positive"
        />
        <KpiCard label="Units sold (this page)" value={formatNumber(totalUnitsSold)} />
        <KpiCard
          label="On-hand units (this page)"
          value={formatNumber(data.rows.reduce((sum, row) => sum + row.onHandUnits, 0))}
          note="Sum across all locations"
        />
      </div>

      {!data.available && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs leading-5 text-danger">
          <strong>Aggregations are not available yet.</strong> Category and top
          product panels read SQL functions in the{" "}
          <code className="mx-1 rounded bg-white/60 px-1">app</code> schema
          (migration{" "}
          <code className="mx-1 rounded bg-white/60 px-1">
            20260817040000_dashboard_aggregations.sql
          </code>
          ). Apply the migration to unlock them. The product table below still
          works.
        </div>
      )}

      <PanelGrid>
        <Panel title="Sales by category">
          <HBarList
            data={(data.byCategory ?? []).map((point) => ({
              label: point.category_name,
              value: point.revenue,
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

      <AdminCardSection title="Products">
        {data.rows.length === 0 ? (
          <AdminEmptyState title="No products" message="Products will appear here once added." />
        ) : (
          <>
            <AdminTable
              head={
                <>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th>Brand</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Variants</Th>
                  <Th className="text-right">Units sold</Th>
                  <Th className="text-right">Revenue</Th>
                  <Th className="text-right">On hand</Th>
                </>
              }
            >
              {data.rows.map((row) => (
                <tr key={row.productId} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <Link
                      href={`/admin/products/${row.productId}`}
                      className="font-medium text-ink hover:text-navy hover:underline"
                    >
                      {row.name}
                    </Link>
                  </Td>
                  <Td className="text-ink-soft">{row.categoryName ?? "—"}</Td>
                  <Td className="text-ink-soft">{row.brandName ?? "—"}</Td>
                  <Td>
                    <AdminBadge tone={productStatusTone(row.status)}>
                      {statusLabel(row.status)}
                    </AdminBadge>
                  </Td>
                  <Td className="text-right text-ink-soft">{row.variantCount}</Td>
                  <Td className="text-right text-ink-soft">{formatNumber(row.unitsSold)}</Td>
                  <Td className="whitespace-nowrap text-right font-medium">
                    {formatGHS(row.revenue)}
                  </Td>
                  <Td className="text-right text-ink-soft">{formatNumber(row.onHandUnits)}</Td>
                </tr>
              ))}
            </AdminTable>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              basePath="/admin/reports/products"
              searchParams={
                new URLSearchParams(
                  range.key === "custom"
                    ? { range: "custom", from: range.customFrom ?? "", to: range.customTo ?? "" }
                    : { range: range.key },
                )
              }
            />
          </>
        )}
      </AdminCardSection>
    </div>
  );
}