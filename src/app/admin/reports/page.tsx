import type { Metadata } from "next";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminEmptyState, AdminTable, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import {
  getExpenseSummary,
  getSalesOverview,
  getTopProducts,
} from "@/lib/admin/reports";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { orderStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Reports — Yemanuel Store Admin",
};

export default async function AdminReportsPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }

  const canReadSales = hasPermission(session, PERMISSIONS.sales.read);
  const canReadExpenses = hasPermission(session, PERMISSIONS.expenses.read);

  const [overview, topProducts, expenseSummary] = await Promise.all([
    canReadSales ? getSalesOverview() : null,
    canReadSales ? getTopProducts(10) : null,
    canReadExpenses ? getExpenseSummary() : null,
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Live figures computed from current records. No historical snapshots yet."
      />

      {canReadSales && overview && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Total orders
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                {overview.totalOrders}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Items sold
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                {overview.totalItemsSold}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Collected revenue
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                {formatGHS(overview.collectedRevenue)}
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                Average order value
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                {formatGHS(overview.averageOrderValue)}
              </p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-lg border border-line bg-white">
              <div className="border-b border-line px-4 py-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Orders by status
                </h2>
              </div>
              {overview.orderStatuses.length === 0 ? (
                <AdminEmptyState title="No orders yet" message="Orders will be counted here." />
              ) : (
                <AdminTable head={<><Th>Status</Th><Th className="text-right">Count</Th></>}>
                  {overview.orderStatuses.map((row) => (
                    <tr key={row.status} className="transition-colors hover:bg-navy-soft/40">
                      <Td>
                        <AdminBadge tone={orderStatusTone(row.status)}>
                          {statusLabel(row.status)}
                        </AdminBadge>
                      </Td>
                      <Td className="text-right font-medium">{row.count}</Td>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </section>

            <section className="rounded-lg border border-line bg-white">
              <div className="border-b border-line px-4 py-2.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Top products by units sold
                </h2>
              </div>
              {topProducts && topProducts.length === 0 ? (
                <AdminEmptyState title="No sales yet" message="Sold variants will appear here." />
              ) : (
                <AdminTable
                  head={
                    <>
                      <Th>Variant</Th>
                      <Th>Product</Th>
                      <Th className="text-right">Units</Th>
                      <Th className="text-right">Revenue</Th>
                    </>
                  }
                >
                  {(topProducts ?? []).map((product) => (
                    <tr key={product.variantName} className="transition-colors hover:bg-navy-soft/40">
                      <Td className="font-medium">{product.variantName}</Td>
                      <Td className="text-ink-soft">{product.productName ?? "—"}</Td>
                      <Td className="text-right text-ink-soft">{product.quantity}</Td>
                      <Td className="whitespace-nowrap text-right font-medium">
                        {formatGHS(product.revenue)}
                      </Td>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </section>
          </div>
        </>
      )}

      {canReadExpenses && expenseSummary && expenseSummary.length > 0 && (
        <section className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Expenses by category
            </h2>
          </div>
          <AdminTable
            head={
              <>
                <Th>Category</Th>
                <Th className="text-right">Expenses</Th>
                <Th className="text-right">Total</Th>
              </>
            }
          >
            {expenseSummary.map((row) => (
              <tr key={row.categoryName} className="transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{row.categoryName}</Td>
                <Td className="text-right text-ink-soft">{row.count}</Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(row.total)}
                </Td>
              </tr>
            ))}
          </AdminTable>
        </section>
      )}

      {!canReadSales && !canReadExpenses && (
        <div className="rounded-lg border border-line bg-white p-4 text-xs text-ink-soft">
          No report data to show — your account does not have view permission for
          sales or expenses.
        </div>
      )}
    </div>
  );
}