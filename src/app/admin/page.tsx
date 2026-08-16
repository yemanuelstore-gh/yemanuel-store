import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminEmptyState, AdminTable, PageHeader, Td, Th } from "@/components/admin/ui";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  movementTypeTone,
  orderStatusTone,
  paymentStatusTone,
  statusLabel,
} from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Dashboard — Yemanuel Store Admin",
};

type Kpi = {
  label: string;
  value: string;
  note: string;
  href?: string;
};

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) return null;

  const canReadProducts = hasPermission(session, PERMISSIONS.products.read);
  const canReadCustomers = hasPermission(session, PERMISSIONS.customers.read);
  const canReadSales = hasPermission(session, PERMISSIONS.sales.read);
  const canReadInventory = hasPermission(session, PERMISSIONS.inventory.read);
  const canReadPurchases = hasPermission(session, PERMISSIONS.purchases.read);

  const client = await createClient();

  const kpis: Kpi[] = [];

  const productsResult = canReadProducts
    ? await client.from("products").select("id", { count: "exact", head: true })
    : null;
  const activeProductsResult = canReadProducts
    ? await client.from("products").select("id", { count: "exact", head: true }).eq("status", "active")
    : null;
  if (productsResult) {
    kpis.push({
      label: "Products",
      value: String(productsResult.count ?? 0),
      note: `${activeProductsResult?.count ?? 0} active`,
      href: "/admin/products",
    });
  }

  const customersResult = canReadCustomers
    ? await client.from("customers").select("id", { count: "exact", head: true })
    : null;
  if (customersResult) {
    kpis.push({
      label: "Customers",
      value: String(customersResult.count ?? 0),
      note: "Registered customers",
      href: "/admin/customers",
    });
  }

  const ordersResult = canReadSales
    ? await client.from("orders").select("id", { count: "exact", head: true })
    : null;
  const pendingOrdersResult = canReadSales
    ? await client
        .from("orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["pending", "confirmed", "processing"])
    : null;
  if (ordersResult) {
    kpis.push({
      label: "Orders",
      value: String(ordersResult.count ?? 0),
      note: `${pendingOrdersResult?.count ?? 0} in progress`,
      href: "/admin/orders",
    });
  }

  const paymentsResult = canReadSales
    ? await client.from("payments").select("amount").in("status", ["paid", "authorized"])
    : null;
  if (paymentsResult) {
    const revenue = (paymentsResult.data ?? []).reduce(
      (sum, payment) => sum + Number(payment.amount),
      0,
    );
    kpis.push({
      label: "Collected revenue",
      value: formatGHS(revenue),
      note: "From paid and authorized payments",
      href: "/admin/orders",
    });
  }

  const inventoryResult = canReadInventory
    ? await client
        .from("inventory_items")
        .select("id, quantity_on_hand, average_cost")
    : null;
  const lowStockResult = canReadInventory
    ? await client
        .from("inventory_items")
        .select("id, quantity_on_hand")
        .not("reorder_level", "is", null)
    : null;
  if (inventoryResult) {
    const rows = inventoryResult.data ?? [];
    const inventoryValue = rows.reduce(
      (sum, item) => sum + Number(item.quantity_on_hand) * Number(item.average_cost),
      0,
    );
    kpis.push({
      label: "Inventory value",
      value: formatGHS(inventoryValue),
      note: `${rows.length} inventory items`,
      href: "/admin/inventory",
    });
  }
  if (lowStockResult) {
    const lowStock = (lowStockResult.data ?? []).filter(
      (item) => Number(item.quantity_on_hand) <= 0,
    ).length;
    kpis.push({
      label: "Low stock items",
      value: String(lowStock),
      note: "Items at or below zero on hand",
      href: "/admin/inventory",
    });
  }

  const payablesResult = canReadPurchases
    ? await client
        .from("supplier_invoices")
        .select("amount")
        .in("status", ["pending", "partially_paid"])
    : null;
  if (payablesResult) {
    const payables = (payablesResult.data ?? []).reduce(
      (sum, invoice) => sum + Number(invoice.amount),
      0,
    );
    kpis.push({
      label: "Outstanding payables",
      value: formatGHS(payables),
      note: "Unpaid supplier invoices",
      href: "/admin/purchases/invoices",
    });
  }

  const [recentOrders, recentMovements, lowStockList] = await Promise.all([
    canReadSales
      ? client
          .from("orders")
          .select(
            "id, order_number, status, payment_status, total_amount, created_at, guest_name, customers(first_name, last_name)",
          )
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve(null),
    canReadInventory
      ? client
          .from("stock_movements")
          .select(
            "id, movement_type, quantity_change, created_at, inventory_items(product_variants(name, sku))",
          )
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve(null),
    canReadInventory
      ? client
          .from("inventory_items")
          .select(
            "id, quantity_on_hand, product_variants(name, sku), locations(name)",
          )
          .not("reorder_level", "is", null)
          .order("quantity_on_hand", { ascending: true })
          .limit(8)
      : Promise.resolve(null),
  ]);

  const lowStockItemsList = (lowStockList?.data ?? []).filter(
    (item) => Number(item.quantity_on_hand) <= 0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Store overview with live database figures. All numbers reflect current records."
      />

      {kpis.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-lg border border-line bg-white p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
                {kpi.label}
              </p>
              <p className="mt-1.5 text-xl font-semibold tracking-tight text-ink">
                {kpi.value}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-faint">{kpi.note}</p>
              {kpi.href && (
                <Link
                  href={kpi.href}
                  className="mt-2 inline-block text-[11px] font-semibold text-navy transition-colors hover:text-navy-dark"
                >
                  View →
                </Link>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-white p-4 text-xs text-ink-soft">
          No metrics to show — your account does not have view permission for
          any data modules yet.
        </div>
      )}

      {canReadSales && (
        <section className="rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Recent orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-[11px] font-semibold text-navy hover:text-navy-dark"
            >
              View all →
            </Link>
          </div>
          {(recentOrders?.data ?? []).length === 0 ? (
            <AdminEmptyState
              title="No orders yet"
              message="Orders placed on the storefront will appear here."
            />
          ) : (
            <AdminTable
              head={
                <>
                  <Th>Order</Th>
                  <Th>Customer</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                  <Th className="text-right">Total</Th>
                </>
              }
            >
              {(recentOrders?.data ?? []).map((order) => {
                const customer = order.customers as unknown as {
                  first_name: string;
                  last_name: string;
                } | null;
                return (
                  <tr key={order.id} className="transition-colors hover:bg-navy-soft/40">
                    <Td>
                      <Link
                        href={`/admin/orders/${order.order_number}`}
                        className="font-semibold text-navy hover:underline"
                      >
                        {order.order_number}
                      </Link>
                    </Td>
                    <Td>
                      {customer
                        ? `${customer.first_name} ${customer.last_name}`
                        : (order.guest_name ?? "—")}
                    </Td>
                    <Td className="whitespace-nowrap text-ink-soft">
                      {new Date(order.created_at).toLocaleDateString("en-GB")}
                    </Td>
                    <Td>
                      <AdminBadge tone={orderStatusTone(order.status)}>
                        {statusLabel(order.status)}
                      </AdminBadge>
                    </Td>
                    <Td>
                      <AdminBadge tone={paymentStatusTone(order.payment_status)}>
                        {statusLabel(order.payment_status)}
                      </AdminBadge>
                    </Td>
                    <Td className="whitespace-nowrap text-right font-semibold">
                      {formatGHS(Number(order.total_amount))}
                    </Td>
                  </tr>
                );
              })}
            </AdminTable>
          )}
        </section>
      )}

      {canReadInventory && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-lg border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Low stock
              </h2>
              <Link
                href="/admin/inventory"
                className="text-[11px] font-semibold text-navy hover:text-navy-dark"
              >
                View inventory →
              </Link>
            </div>
            {lowStockItemsList.length === 0 ? (
              <AdminEmptyState
                title="No low stock items"
                message="Every tracked item is above its reorder level."
              />
            ) : (
              <AdminTable
                head={
                  <>
                    <Th>Variant</Th>
                    <Th>Location</Th>
                    <Th className="text-right">On hand</Th>
                  </>
                }
              >
                {lowStockItemsList.map((item) => {
                  const variant = item.product_variants as unknown as {
                    name: string;
                    sku: string;
                  } | null;
                  const location = item.locations as unknown as { name: string } | null;
                  return (
                    <tr key={item.id} className="transition-colors hover:bg-navy-soft/40">
                      <Td>
                        <span className="font-medium text-ink">{variant?.name ?? "—"}</span>
                        <span className="ml-1.5 text-[11px] text-ink-faint">
                          {variant?.sku}
                        </span>
                      </Td>
                      <Td>{location?.name ?? "—"}</Td>
                      <Td className="text-right font-semibold text-danger">
                        {Number(item.quantity_on_hand)}
                      </Td>
                    </tr>
                  );
                })}
              </AdminTable>
            )}
          </section>

          <section className="rounded-lg border border-line bg-white">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                Recent stock movements
              </h2>
              <Link
                href="/admin/inventory/movements"
                className="text-[11px] font-semibold text-navy hover:text-navy-dark"
              >
                View all →
              </Link>
            </div>
            {(recentMovements?.data ?? []).length === 0 ? (
              <AdminEmptyState
                title="No stock movements yet"
                message="Purchase receipts, sales and adjustments will be logged here."
              />
            ) : (
              <AdminTable
                head={
                  <>
                    <Th>Type</Th>
                    <Th>Variant</Th>
                    <Th>Date</Th>
                    <Th className="text-right">Change</Th>
                  </>
                }
              >
                {(recentMovements?.data ?? []).map((movement) => {
                  const variant = movement.inventory_items as unknown as {
                    product_variants: { name: string; sku: string } | null;
                  } | null;
                  return (
                    <tr key={movement.id} className="transition-colors hover:bg-navy-soft/40">
                      <Td>
                        <AdminBadge tone={movementTypeTone(movement.movement_type)}>
                          {statusLabel(movement.movement_type)}
                        </AdminBadge>
                      </Td>
                      <Td>
                        <span className="text-[13px] text-ink">
                          {variant?.product_variants?.name ?? "—"}
                        </span>
                        <span className="ml-1.5 text-[11px] text-ink-faint">
                          {variant?.product_variants?.sku}
                        </span>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-soft">
                        {new Date(movement.created_at).toLocaleDateString("en-GB")}
                      </Td>
                      <Td
                        className={`text-right font-semibold ${
                          Number(movement.quantity_change) < 0
                            ? "text-danger"
                            : "text-ink"
                        }`}
                      >
                        {Number(movement.quantity_change) > 0 ? "+" : ""}
                        {Number(movement.quantity_change)}
                      </Td>
                    </tr>
                  );
                })}
              </AdminTable>
            )}
          </section>
        </div>
      )}
    </div>
  );
}