import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { ContentSection } from "@/components/admin/content-section";
import { KpiCard, type KpiTrend } from "@/components/admin/kpi-card";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { RangeSelector } from "@/components/admin/dashboard/range-selector";
import { QuickActions, type QuickAction } from "@/components/admin/dashboard/quick-actions";
import { SalesChart, ChartSummaryStat } from "@/components/admin/dashboard/sales-chart";
import { AlertsPanel } from "@/components/admin/dashboard/alerts-panel";
import { TopProductsTable } from "@/components/admin/dashboard/top-products";
import { TopCustomersTable } from "@/components/admin/dashboard/top-customers";
import { CategoryMix } from "@/components/admin/dashboard/category-mix";
import { RecentOrdersTable } from "@/components/admin/dashboard/recent-orders";
import { FinancialHealth } from "@/components/admin/dashboard/financial-health";
import { LiquidFunds } from "@/components/admin/dashboard/liquid-funds";
import { Profitability } from "@/components/admin/dashboard/profitability";
import { InventoryIntelligence } from "@/components/admin/dashboard/inventory-intelligence";
import { PurchasingOverviewSection } from "@/components/admin/dashboard/purchasing-overview";
import { CollectionBreakdown } from "@/components/admin/dashboard/collection-breakdown";
import { ExpenseAnalytics } from "@/components/admin/dashboard/expense-analytics";
import { CustomerGrowth } from "@/components/admin/dashboard/customer-growth";
import { RecentActivity } from "@/components/admin/dashboard/recent-activity";
import { BusinessLifetimeSection } from "@/components/admin/dashboard/business-lifetime";
import type { IconName } from "@/components/ui/icons";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { BUSINESS_START_DATE } from "@/lib/business-calendar";
import { listFinancialAccounts } from "@/lib/admin/finance";
import {
  resolveDashboardRange,
  previousRange,
  formatCompactGHS,
  percentDelta,
  getSalesRange,
  getSalesTrend,
  getPaymentsRange,
  getInventorySummary,
  getExpensesRange,
  getReceivables,
  getPayables,
  getOperationsAlerts,
  getTopProducts,
  getTopCustomers,
  getCategorySales,
  getRecentOrders,
  getCustomerStats,
  getInventoryByCategory,
  getGoodsReceivedByMonth,
  getExpenseSnapshot,
  getExpensesByCategory,
  getExpensesByMonth,
  getPurchasingOverview,
  getCollectionsByMethod,
  getRecentPayments,
  getRecentStockMovements,
  getRecentPurchaseOrders,
  getCustomerGrowth,
  getBusinessLifetime,
  type DashboardRange,
  type SalesRangeData,
} from "@/lib/admin/dashboard";
import { formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — Yemanuel Store ERP",
};

function formatCount(value: number): string {
  return value.toLocaleString("en-GB");
}

/**
 * Resolve a dashboard data query. A single failing query (a missing table,
 * a temporary network issue, an RLS denial) must never take the whole
 * dashboard down — the section widgets already handle `null`.
 */
async function safe<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}

type KpiDefinition = {
  label: string;
  value: string;
  icon: IconName;
  trend?: KpiTrend;
  comparison?: string;
};

function KpiGrid({ kpis }: { kpis: KpiDefinition[] }) {
  if (kpis.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} {...kpi} />
      ))}
    </div>
  );
}

function buildPrimaryKpis(
  sales: SalesRangeData | null,
  previousSales: SalesRangeData | null,
  range: DashboardRange,
): KpiDefinition[] {
  if (sales === null) return [];
  const salesDelta =
    previousSales != null ? percentDelta(sales.revenue, previousSales.revenue) : null;
  const profitDelta =
    previousSales != null ? percentDelta(sales.gross_profit, previousSales.gross_profit) : null;
  const ordersDelta =
    previousSales != null ? percentDelta(sales.order_count, previousSales.order_count) : null;

  return [
    {
      label: "Revenue",
      value: formatCompactGHS(sales.revenue),
      icon: "payments",
      trend: salesDelta != null ? { value: salesDelta, label: range.label } : undefined,
    },
    {
      label: "Gross Profit",
      value: formatCompactGHS(sales.gross_profit),
      icon: "sparkle",
      trend: profitDelta != null ? { value: profitDelta, label: range.label } : undefined,
    },
    {
      label: "Orders",
      value: formatCount(sales.order_count),
      icon: "orders",
      trend: ordersDelta != null ? { value: ordersDelta, label: range.label } : undefined,
    },
    {
      label: "Average Order Value",
      value: formatGHS(sales.average_order_value),
      icon: "reports",
      comparison:
        previousSales != null
          ? `vs ${formatCompactGHS(previousSales.average_order_value)}`
          : undefined,
    },
  ];
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; start?: string; end?: string }>;
}) {
  const session = await getAdminSession();
  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const previous = previousRange(range);

  const canSales = hasPermission(session, PERMISSIONS.sales.read);
  const canInventory = hasPermission(session, PERMISSIONS.inventory.read);
  const canCustomers = hasPermission(session, PERMISSIONS.customers.read);
  const canExpenses = hasPermission(session, PERMISSIONS.expenses.read);
  const canPurchases = hasPermission(session, PERMISSIONS.purchases.read);
  const canFinance = hasPermission(session, PERMISSIONS.finance.read);
  const canProductsCreate = hasPermission(session, PERMISSIONS.products.create);
  const canCustomersCreate = hasPermission(session, PERMISSIONS.customers.create);
  const canInventoryCreate = hasPermission(session, PERMISSIONS.inventory.create);
  const canInventoryAdjust = hasPermission(session, PERMISSIONS.inventory.adjust);
  const canExpensesCreate = hasPermission(session, PERMISSIONS.expenses.create);
  const canPurchasesCreate = hasPermission(session, PERMISSIONS.purchases.create);
  const canStaffManage = hasPermission(session, PERMISSIONS.staff.manage);

  const client = await createClient();

  const currentYear = new Date().getUTCFullYear();

  const [
    sales,
    previousSales,
    trend,
    payments,
    inventory,
    expenses,
    receivables,
    payables,
    alerts,
    topProducts,
    recentOrders,
    customers,
    topCustomers,
    categorySales,
    accounts,
    inventoryByCategory,
    goodsReceived,
    expenseSnapshot,
    expensesByCategory,
    expensesByMonth,
    purchasingOverview,
    collections,
    recentPayments,
    recentMovements,
    recentPurchaseOrders,
    customerGrowth,
    lifetime,
  ] = await Promise.all([
    canSales ? safe(getSalesRange(client, range)) : null,
    canSales ? safe(getSalesRange(client, previous)) : null,
    canSales ? safe(getSalesTrend(client, range)) : null,
    canSales ? safe(getPaymentsRange(client, range)) : null,
    canInventory ? safe(getInventorySummary(client)) : null,
    canExpenses ? safe(getExpensesRange(client, range)) : null,
    canSales ? safe(getReceivables(client, 4)) : null,
    canPurchases ? safe(getPayables(client, 4)) : null,
    canSales || canPurchases ? safe(getOperationsAlerts(client)) : null,
    canSales ? safe(getTopProducts(client, range, 6)) : null,
    canSales ? safe(getRecentOrders(client, 8)) : null,
    canCustomers ? safe(getCustomerStats(client, range)) : null,
    canSales ? safe(getTopCustomers(client, range, 5)) : null,
    canSales ? safe(getCategorySales(client, range, 6)) : null,
    canFinance ? safe(listFinancialAccounts(client)) : null,
    canInventory ? safe(getInventoryByCategory(client, 6)) : null,
    canInventory || canPurchases ? safe(getGoodsReceivedByMonth(client, currentYear)) : null,
    canExpenses ? safe(getExpenseSnapshot(client)) : null,
    canExpenses ? safe(getExpensesByCategory(client, range, 6)) : null,
    canExpenses ? safe(getExpensesByMonth(client, currentYear)) : null,
    canPurchases ? safe(getPurchasingOverview(client)) : null,
    canSales ? safe(getCollectionsByMethod(client, range)) : null,
    canSales ? safe(getRecentPayments(client, 6)) : null,
    canInventory ? safe(getRecentStockMovements(client, 6)) : null,
    canPurchases ? safe(getRecentPurchaseOrders(client, 6)) : null,
    canCustomers ? safe(getCustomerGrowth(client, 12)) : null,
    canSales || canExpenses || canCustomers ? safe(getBusinessLifetime(client)) : null,
  ]);

  const quickActions: QuickAction[] = [];
  if (canProductsCreate) {
    quickActions.push({ label: "New Product", href: "/admin/products", icon: "products" });
  }
  if (canCustomersCreate) {
    quickActions.push({ label: "New Customer", href: "/admin/customers", icon: "customers" });
  }
  if (canInventoryCreate) {
    quickActions.push({
      label: "Stock Transfer",
      href: "/admin/inventory/transfers",
      icon: "transfers",
    });
  }
  if (canInventoryAdjust) {
    quickActions.push({
      label: "Stock Adjustment",
      href: "/admin/inventory/adjustments",
      icon: "adjustments",
    });
  }
  if (canPurchasesCreate) {
    quickActions.push({
      label: "New Purchase Order",
      href: "/admin/purchases",
      icon: "purchase-orders",
    });
  }
  if (canExpensesCreate) {
    quickActions.push({ label: "Add Expense", href: "/admin/expenses", icon: "expenses" });
  }
  if (canStaffManage) {
    quickActions.push({ label: "Add Employee", href: "/admin/hr/employees", icon: "employees" });
  }

  const primaryKpis = buildPrimaryKpis(sales, previousSales, range);

  const secondaryKpis: KpiDefinition[] = [];
  if (canSales && sales !== null) {
    secondaryKpis.push({
      label: "Units Sold",
      value: formatCount(sales.units_sold),
      icon: "products",
      comparison: `${formatCount(sales.order_count)} orders`,
    });
  }
  if (canInventory && inventory !== null) {
    secondaryKpis.push({
      label: "Inventory Value",
      value: formatCompactGHS(inventory.total_value),
      icon: "stock",
      comparison: `${formatCount(inventory.item_count)} stock lines`,
    });
  }
  if (canCustomers && customers !== null) {
    secondaryKpis.push({
      label: "Customers",
      value: formatCount(customers.total_customers),
      icon: "customers",
      comparison: `${formatCount(customers.new_in_range)} new this period`,
    });
  }
  if (canExpenses && expenses !== null) {
    secondaryKpis.push({
      label: "Expenses",
      value: formatCompactGHS(expenses.total),
      icon: "expenses",
      comparison: `${formatCount(expenses.expense_count)} entries`,
    });
  }
  if (canSales && receivables !== null) {
    secondaryKpis.push({
      label: "Receivables",
      value: formatCompactGHS(receivables.total),
      icon: "receivables",
      comparison: `${formatCount(receivables.rows.length)} customers owed`,
    });
  }
  if (canPurchases && payables !== null) {
    secondaryKpis.push({
      label: "Payables",
      value: formatCompactGHS(payables.total),
      icon: "payables",
      comparison: `${formatCount(payables.rows.length)} suppliers owed`,
    });
  }

  const hasAnyPermission =
    canSales || canInventory || canCustomers || canExpenses || canPurchases || canFinance;
  const showOperations = canInventory || canSales || canPurchases;
  const showRecentActivity = canSales || canInventory || canPurchases;
  const showLifetime = canSales || canExpenses || canCustomers;

  const todayLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const openingLabel = BUSINESS_START_DATE.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description={
          <>
            <span className="block">Store overview</span>
            <span className="mt-1 block text-[11px] font-medium uppercase tracking-[0.08em] text-erp-text-muted">
              {todayLabel} · Operating Mon–Sat · Since {openingLabel} · All
              figures in GH₵
            </span>
          </>
        }
        filters={
          <RangeSelector
            current={range.key}
            customStart={params.start}
            customEnd={params.end}
          />
        }
      />

      {!hasAnyPermission ? (
        <Alert variant="info" title="Limited access">
          Your account has no management permissions yet. Contact the store
          administrator to grant access to the dashboard sections you need.
        </Alert>
      ) : (
        <>
          <QuickActions actions={quickActions} />

          {(primaryKpis.length > 0 || secondaryKpis.length > 0) && (
            <div className="mt-4 space-y-4">
              <KpiGrid kpis={primaryKpis} />
              <KpiGrid kpis={secondaryKpis} />
            </div>
          )}

          {canSales && (
            <ContentSection
              className="mt-4"
              title="Sales Performance"
              description={`Revenue and gross profit for ${range.label.toLowerCase()}`}
            >
              {sales === null ? (
                <Alert variant="warning" title="Sales data unavailable">
                  We could not load sales data right now. Please try again shortly.
                </Alert>
              ) : (
                <div className="grid gap-6 lg:grid-cols-[1fr_240px]">
                  <div className="min-w-0">
                    <SalesChart
                      points={trend ?? []}
                      monthly={range.days > 120}
                      loading={trend === null}
                    />
                    {trend === null && (
                      <p className="mt-2 text-xs text-erp-text-muted">
                        Trend unavailable right now.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-1">
                    <ChartSummaryStat
                      label="Average order value"
                      value={formatGHS(sales.average_order_value)}
                      accent="navy"
                    />
                    <ChartSummaryStat
                      label="Units sold"
                      value={`${formatCount(sales.units_sold)} units`}
                    />
                    <ChartSummaryStat
                      label="Gross margin"
                      value={`${sales.gross_margin.toFixed(1)}%`}
                      accent="gold"
                    />
                    <ChartSummaryStat
                      label="Cancelled orders"
                      value={formatCount(sales.cancelled_orders)}
                    />
                  </div>
                </div>
              )}
            </ContentSection>
          )}

          {(showOperations || canSales) && (
            <div
              className={
                showOperations && canSales
                  ? "mt-4 grid gap-4 lg:grid-cols-2"
                  : "mt-4"
              }
            >
              {showOperations && (
                <ContentSection
                  title="Operational Health"
                  description="Items that need your attention"
                >
                  <AlertsPanel
                    alerts={canSales || canPurchases ? alerts : null}
                    lowStockCount={
                      canInventory ? (inventory?.low_stock_count ?? null) : null
                    }
                    outOfStockCount={
                      canInventory ? (inventory?.out_of_stock_count ?? null) : null
                    }
                  />
                </ContentSection>
              )}

              {canSales && (
                <ContentSection
                  title="Top Products"
                  description="By revenue in the selected period"
                >
                  {topProducts === null ? (
                    <Alert variant="warning" title="Product data unavailable">
                      We could not load product sales right now.
                    </Alert>
                  ) : (
                    <TopProductsTable products={topProducts} />
                  )}
                </ContentSection>
              )}
            </div>
          )}

          {canSales && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <ContentSection
                title="Top Customers"
                description="By revenue in the selected period"
              >
                {topCustomers === null ? (
                  <Alert variant="warning" title="Customer data unavailable">
                    We could not load customer sales right now.
                  </Alert>
                ) : (
                  <TopCustomersTable customers={topCustomers} />
                )}
              </ContentSection>

              <ContentSection
                title="Category Mix"
                description="Revenue share by category in the selected period"
              >
                {categorySales === null ? (
                  <Alert variant="warning" title="Category data unavailable">
                    We could not load category sales right now.
                  </Alert>
                ) : (
                  <CategoryMix rows={categorySales} />
                )}
              </ContentSection>
            </div>
          )}

          {(canSales || canPurchases || canExpenses) && (
            <ContentSection
              className="mt-4"
              title="Financial Health"
              description="Receivables, payables, expenses and payment positions"
            >
              <FinancialHealth
                receivables={canSales ? receivables : null}
                payables={canPurchases ? payables : null}
                expenses={canExpenses ? expenses : null}
                payments={canSales ? payments : null}
              />
            </ContentSection>
          )}

          {(canFinance || (canSales && canExpenses)) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {canFinance && (
                <ContentSection
                  title="Liquid Funds"
                  description="Where money is held right now"
                >
                  <LiquidFunds accounts={accounts} />
                </ContentSection>
              )}
              {canSales && canExpenses && (
                <ContentSection
                  title="Profitability"
                  description={`P&L bridge for ${range.label.toLowerCase()}`}
                >
                  <Profitability sales={sales} expenses={expenses} />
                </ContentSection>
              )}
            </div>
          )}

          {canInventory && (
            <ContentSection
              className="mt-4"
              title="Inventory Intelligence"
              description="Stock value, inflow and movements"
            >
              <InventoryIntelligence
                inventory={inventory}
                byCategory={inventoryByCategory}
                inflow={goodsReceived}
                movements={recentMovements}
              />
            </ContentSection>
          )}

          {canPurchases && (
            <ContentSection
              className="mt-4"
              title="Purchasing Overview"
              description="Receipts, open orders and supplier balances"
            >
              <PurchasingOverviewSection
                overview={purchasingOverview}
                inflow={goodsReceived}
              />
            </ContentSection>
          )}

          {(canSales || canExpenses) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {canSales && (
                <ContentSection
                  title="Collection Breakdown"
                  description={`Payments by method in ${range.label.toLowerCase()}`}
                >
                  <CollectionBreakdown collections={collections} />
                </ContentSection>
              )}
              {canExpenses && (
                <ContentSection
                  title="Expense Analytics"
                  description={`Today, this month and this year`}
                >
                  <ExpenseAnalytics
                    snapshot={expenseSnapshot}
                    byCategory={expensesByCategory}
                    byMonth={expensesByMonth}
                  />
                </ContentSection>
              )}
            </div>
          )}

          {canCustomers && (
            <ContentSection
              className="mt-4"
              title="Customer Growth"
              description="New customers and repeat behaviour"
            >
              <CustomerGrowth growth={customerGrowth} stats={customers} />
            </ContentSection>
          )}

          {showRecentActivity && (
            <ContentSection
              className="mt-4"
              title="Recent Activity"
              description="Latest payments, stock movements and purchase orders"
            >
              <RecentActivity
                payments={recentPayments}
                movements={recentMovements}
                purchaseOrders={recentPurchaseOrders}
              />
            </ContentSection>
          )}

          {canSales && (
            <ContentSection
              className="mt-4"
              title="Recent Orders"
              description="Latest orders across all channels"
            >
              {recentOrders === null ? (
                <Alert variant="warning" title="Order data unavailable">
                  We could not load recent orders right now.
                </Alert>
              ) : (
                <RecentOrdersTable orders={recentOrders} />
              )}
            </ContentSection>
          )}

          {showLifetime && (
            <ContentSection
              className="mt-4"
              title="Business Lifetime"
              description="Highlights since the store opened"
            >
              <BusinessLifetimeSection lifetime={lifetime} />
            </ContentSection>
          )}

          <Card className="mt-8 p-4">
            <p className="text-xs leading-relaxed text-erp-text-secondary">
              Showing{" "}
              <span className="font-medium text-erp-text">
                {range.label.toLowerCase()}
              </span>{" "}
              —{" "}
              {range.start.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}{" "}
              to{" "}
              {range.end.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              . Use the period selector above to change the window.
            </p>
          </Card>
        </>
      )}
    </PageContainer>
  );
}