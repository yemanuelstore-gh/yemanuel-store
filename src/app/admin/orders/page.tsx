import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  SearchForm,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { getOrders } from "@/lib/admin/sales";
import {
  fulfilmentStatusTone,
  orderPaymentStatusTone,
  orderStatusTone,
  statusLabel,
} from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Orders — Yemanuel Store Admin",
};

type SearchParams = Promise<{
  q?: string;
  status?: string;
  payment?: string;
  fulfilment?: string;
  page?: string;
}>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getOrders({
    q: params.q,
    status: params.status,
    paymentStatus: params.payment,
    fulfilmentStatus: params.fulfilment,
    page,
  });

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.status) filterParams.set("status", params.status);
  if (params.payment) filterParams.set("payment", params.payment);
  if (params.fulfilment) filterParams.set("fulfilment", params.fulfilment);

  const selectClasses =
    "h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Orders"
        description={`${result.total} order${result.total === 1 ? "" : "s"}.`}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search order number or guest…"
            initialValue={params.q ?? ""}
            extraFields={
              <>
                <select
                  name="status"
                  defaultValue={params.status ?? ""}
                  aria-label="Filter by order status"
                  className={selectClasses}
                >
                  <option value="">All order statuses</option>
                  {["pending", "confirmed", "processing", "ready_for_delivery", "out_for_delivery", "shipped", "delivered", "cancelled"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {statusLabel(value)}
                      </option>
                    ),
                  )}
                </select>
                <select
                  name="payment"
                  defaultValue={params.payment ?? ""}
                  aria-label="Filter by payment status"
                  className={selectClasses}
                >
                  <option value="">All payment statuses</option>
                  {["unpaid", "partially_paid", "paid", "refunded", "partially_refunded"].map(
                    (value) => (
                      <option key={value} value={value}>
                        {statusLabel(value)}
                      </option>
                    ),
                  )}
                </select>
                <select
                  name="fulfilment"
                  defaultValue={params.fulfilment ?? ""}
                  aria-label="Filter by fulfilment status"
                  className={selectClasses}
                >
                  <option value="">All fulfilment statuses</option>
                  {["unfulfilled", "partially_fulfilled", "fulfilled"].map((value) => (
                    <option key={value} value={value}>
                      {statusLabel(value)}
                    </option>
                  ))}
                </select>
              </>
            }
          />
        </div>

        {result.orders.length === 0 ? (
          <AdminEmptyState
            title="No orders found"
            message="Try adjusting the filters, or check back after the first order is placed."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Channel</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th>Fulfilment</Th>
                <Th className="text-right">Total</Th>
              </>
            }
          >
            {result.orders.map((order) => (
              <tr key={order.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/orders/${order.orderNumber}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {order.orderNumber}
                  </Link>
                </Td>
                <Td className="text-ink">{order.customerName ?? order.guestName ?? "Guest"}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(order.createdAt).toLocaleDateString("en-GB")}
                </Td>
                <Td className="capitalize text-ink-soft">{statusLabel(order.channel)}</Td>
                <Td>
                  <AdminBadge tone={orderStatusTone(order.status)}>
                    {statusLabel(order.status)}
                  </AdminBadge>
                </Td>
                <Td>
                  <AdminBadge tone={orderPaymentStatusTone(order.paymentStatus)}>
                    {statusLabel(order.paymentStatus)}
                  </AdminBadge>
                </Td>
                <Td>
                  <AdminBadge tone={fulfilmentStatusTone(order.fulfilmentStatus)}>
                    {statusLabel(order.fulfilmentStatus)}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap text-right font-semibold">
                  {formatGHS(order.totalAmount)}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/orders"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}