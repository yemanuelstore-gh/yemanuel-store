import type { Metadata } from "next";
import Link from "next/link";
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

type ReportHubEntry = {
  title: string;
  description: string;
  href: string;
  allowed: boolean;
};

export default async function AdminReportsPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }

  const canReadSales = hasPermission(session, PERMISSIONS.sales.read);
  const canReadExpenses = hasPermission(session, PERMISSIONS.expenses.read);
  const canReadInventory = hasPermission(session, PERMISSIONS.inventory.read);
  const canReadCustomers = hasPermission(session, PERMISSIONS.customers.read);
  const canReadPurchases = hasPermission(session, PERMISSIONS.purchases.read);
  const canReadProducts = hasPermission(session, PERMISSIONS.products.read);
  const canReadHr = hasPermission(session, PERMISSIONS.hr.read);

  const hub: ReportHubEntry[] = [
    {
      title: "Financial",
      description: "Profit, cash flow, receivables and payables position.",
      href: "/admin/reports/financial",
      allowed: true,
    },
    {
      title: "Sales",
      description: "Revenue, orders, products and payment methods.",
      href: "/admin/reports/sales",
      allowed: canReadSales,
    },
    {
      title: "Products",
      description: "Product catalogue performance and stock on hand.",
      href: "/admin/reports/products",
      allowed: canReadProducts && canReadSales,
    },
    {
      title: "Inventory",
      description: "Valuation, locations, low stock and movement trend.",
      href: "/admin/reports/inventory",
      allowed: canReadInventory,
    },
    {
      title: "Customers",
      description: "Customer activity, spend and repeat behaviour.",
      href: "/admin/reports/customers",
      allowed: canReadCustomers && canReadSales,
    },
    {
      title: "Purchasing",
      description: "Receipts, suppliers, purchase pipeline and payables.",
      href: "/admin/reports/purchasing",
      allowed: canReadPurchases,
    },
    {
      title: "Expenses",
      description: "Operating expenses by category and month.",
      href: "/admin/reports/expenses",
      allowed: canReadExpenses,
    },
    {
      title: "HR",
      description: "Headcount, departments and salary structures.",
      href: "/admin/reports/hr",
      allowed: canReadHr,
    },
  ];

  const [overview, topProducts, expenseSummary] = await Promise.all([
    canReadSales ? getSalesOverview() : null,
    canReadSales ? getTopProducts(10) : null,
    canReadExpenses ? getExpenseSummary() : null,
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="Live figures computed from current records. No historical snapshots yet."
      />

      <section className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="flex items-center gap-1.5 border-b border-line bg-canvas/40 px-4 py-2.5">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink">
            Report hub
          </h2>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {hub.map((entry) =>
            entry.allowed ? (
              <Link
                key={entry.title}
                href={entry.href}
                className="group relative overflow-hidden rounded-md border border-line bg-white p-3 transition-all hover:-translate-y-px hover:border-gold/40 hover:shadow-soft"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
                />
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-gold"
                  />
                  <p className="text-[13px] font-semibold text-ink">{entry.title}</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-ink-soft">
                  {entry.description}
                </p>
              </Link>
            ) : (
              <div
                key={entry.title}
                className="rounded-md border border-dashed border-line-strong bg-canvas/60 p-3 opacity-60"
                title="Your account does not have the underlying permission for this report"
              >
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-line-strong" />
                  <p className="text-[13px] font-semibold text-ink-faint">{entry.title}</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-4 text-ink-faint">
                  Requires the underlying module permission.
                </p>
              </div>
            ),
          )}
        </div>
      </section>

      {canReadSales && overview && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Total orders", value: String(overview.totalOrders) },
              { label: "Items sold", value: String(overview.totalItemsSold) },
              { label: "Collected revenue", value: formatGHS(overview.collectedRevenue) },
              { label: "Average order value", value: formatGHS(overview.averageOrderValue) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="relative overflow-hidden rounded-lg border border-line bg-white p-4"
              >
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/80 to-transparent"
                />
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                  {stat.label}
                </p>
                <p className="mt-1.5 text-xl font-semibold tracking-tight tabular-nums text-ink">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="flex items-center gap-1.5 border-b border-line bg-canvas/40 px-4 py-2.5">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink">
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
                      <Td className="text-right font-medium tabular-nums">{row.count}</Td>
                    </tr>
                  ))}
                </AdminTable>
              )}
            </section>

            <section className="overflow-hidden rounded-lg border border-line bg-white">
              <div className="flex items-center gap-1.5 border-b border-line bg-canvas/40 px-4 py-2.5">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink">
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
                      <Td className="text-right text-ink-soft tabular-nums">{product.quantity}</Td>
                      <Td className="whitespace-nowrap text-right font-medium tabular-nums">
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
        <section className="overflow-hidden rounded-lg border border-line bg-white">
          <div className="flex items-center gap-1.5 border-b border-line bg-canvas/40 px-4 py-2.5">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-ink">
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
                <Td className="text-right text-ink-soft tabular-nums">{row.count}</Td>
                <Td className="whitespace-nowrap text-right font-medium tabular-nums">
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