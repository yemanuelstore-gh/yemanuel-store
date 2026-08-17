import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData, resolveDashboardRange } from "@/lib/admin/dashboard";
import { getOrders } from "@/lib/admin/sales";
import { getStockMovements } from "@/lib/admin/inventory";
import { getPurchaseOrders, getGoodsReceipts } from "@/lib/admin/purchasing";
import { getAdminPayments } from "@/lib/admin/payments";
import { DateRangePicker } from "@/components/admin/dashboard/date-range-picker";
import {
  AlertsStrip,
  TopKpiGrid,
  QuickActions,
  SalesAnalyticsSection,
  PerformanceSection,
  InventorySection,
  PurchasingSection,
  CustomersSection,
  ExpensesSection,
  PaymentsSection,
  HistorySection,
  RecentOrdersPanel,
  RecentMovementsPanel,
  LowStockPanel,
  RecentPaymentsPanel,
  RecentPurchasesPanel,
} from "@/components/admin/dashboard/sections";

export const metadata: Metadata = {
  title: "Dashboard — Yemanuel Store Admin",
};

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;

  const params = await searchParams;
  const range = resolveDashboardRange(params);

  const perms = {
    sales: hasPermission(session, PERMISSIONS.sales.read),
    inventory: hasPermission(session, PERMISSIONS.inventory.read),
    purchases: hasPermission(session, PERMISSIONS.purchases.read),
    customers: hasPermission(session, PERMISSIONS.customers.read),
    expenses: hasPermission(session, PERMISSIONS.expenses.read),
  };
  const anyPerm = perms.sales || perms.inventory || perms.purchases || perms.customers || perms.expenses;

  const data = await getDashboardData(range, perms);

  const client = await createClient();

  const [ordersResult, movementsResult, lowStockResult, paymentsResult, posResult, receiptsResult] =
    await Promise.all([
      perms.sales
        ? getOrders({ page: 1, pageSize: 8 })
        : Promise.resolve({ orders: [], total: 0 }),
      perms.inventory
        ? getStockMovements({ page: 1, pageSize: 8 })
        : Promise.resolve({ movements: [], total: 0 }),
      perms.inventory
        ? client
            .from("inventory_items")
            .select(
              "id, quantity_on_hand, reorder_level, product_variants(name, sku), locations(name)",
            )
            .not("reorder_level", "is", null)
            .order("quantity_on_hand", { ascending: true })
            .limit(200)
        : Promise.resolve({ data: [] }),
      perms.sales
        ? getAdminPayments({ page: 1, pageSize: 8 })
        : Promise.resolve({ payments: [], total: 0 }),
      perms.purchases
        ? getPurchaseOrders({ page: 1, pageSize: 5 })
        : Promise.resolve({ orders: [], total: 0 }),
      perms.purchases
        ? getGoodsReceipts({ page: 1, pageSize: 5 })
        : Promise.resolve({ receipts: [], total: 0 }),
    ]);

  const quickActions = [
    {
      label: "New Product",
      href: "/admin/products/new",
      allowed: hasPermission(session, PERMISSIONS.products.create),
    },
    {
      label: "New Customer",
      href: "/admin/customers",
      allowed: hasPermission(session, PERMISSIONS.customers.create),
    },
    {
      label: "Stock Transfer",
      href: "/admin/inventory/transfers",
      allowed: hasPermission(session, PERMISSIONS.inventory.create),
    },
    {
      label: "Stock Adjustment",
      href: "/admin/inventory/adjustments",
      allowed: hasPermission(session, PERMISSIONS.inventory.adjust),
    },
    {
      label: "New Purchase Order",
      href: "/admin/purchases/orders",
      allowed: hasPermission(session, PERMISSIONS.purchases.create),
    },
    {
      label: "Add Expense",
      href: "/admin/expenses",
      allowed: hasPermission(session, PERMISSIONS.expenses.create),
    },
    {
      label: "Add Employee",
      href: "/admin/staff",
      allowed: hasPermission(session, PERMISSIONS.staff.manage),
    },
  ].filter((action) => action.allowed);

  const lowStockItems = (lowStockResult.data ?? [])
    .filter(
      (item) =>
        item.reorder_level !== null &&
        Number(item.quantity_on_hand) <= Number(item.reorder_level),
    )
    .slice(0, 10) as unknown as {
    id: string;
    quantity_on_hand: number;
    reorder_level: number | null;
    product_variants: { name: string; sku: string } | null;
    locations: { name: string } | null;
  }[];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        description={`Store overview · ${range.label} · operating Mon–Sat since 17 Jan 2022 · all figures in GH₵`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker current={range.key} customFrom={range.customFrom} customTo={range.customTo} />
          </div>
        }
      />

      <QuickActions actions={quickActions} />

      {data.closedToday && (
        <div className="rounded-lg border border-gold/30 bg-gold-soft px-4 py-2.5 text-xs leading-5 text-gold-dark">
          <strong>Store closed today (Sunday).</strong> Yemanuel Store operates
          Monday–Saturday. Figures for today are zero; use “Previous Business
          Day” or “This Week” to review the latest trading.
        </div>
      )}

      {anyPerm && !data.rpcAvailable && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs leading-5 text-danger">
          <strong>Dashboard aggregations are not available yet.</strong> The
          dashboard reads pre-aggregated figures from SQL functions in the
          <code className="mx-1 rounded bg-white/60 px-1">app</code> schema
          (migration{" "}
          <code className="mx-1 rounded bg-white/60 px-1">
            20260817040000_dashboard_aggregations.sql
          </code>
          ). Apply the migration (e.g. <code className="mx-1 rounded bg-white/60 px-1">supabase db push</code>)
          to unlock every section. No numbers are fabricated while this is
          pending.
        </div>
      )}

      <AlertsStrip data={data} perms={perms} />
      <TopKpiGrid data={data} perms={perms} />

      {perms.sales && <SalesAnalyticsSection data={data} />}
      {(perms.sales || perms.expenses) && <PerformanceSection data={data} perms={perms} />}

      <div className="grid gap-5 xl:grid-cols-2">
        {perms.inventory && <InventorySection data={data} />}
        {perms.purchases && <PurchasingSection data={data} />}
        {perms.customers && <CustomersSection data={data} />}
        {perms.expenses && <ExpensesSection data={data} />}
        {perms.sales && <PaymentsSection data={data} />}
      </div>

      <HistorySection data={data} perms={perms} />

      <div className="grid gap-5 xl:grid-cols-2">
        {perms.sales && <RecentOrdersPanel orders={ordersResult.orders} />}
        {perms.sales && <RecentPaymentsPanel payments={paymentsResult.payments} />}
        {perms.inventory && <LowStockPanel items={lowStockItems} totalCount={data.inventory?.low_stock_count ?? 0} />}
        {perms.inventory && <RecentMovementsPanel movements={movementsResult.movements} />}
        {perms.purchases && (
          <RecentPurchasesPanel
            orders={posResult.orders.map((order) => ({
              id: order.id,
              poNumber: order.poNumber,
              supplierName: order.supplierName,
              status: order.status,
              createdAt: order.createdAt,
            }))}
            receipts={receiptsResult.receipts}
          />
        )}
      </div>
    </div>
  );
}