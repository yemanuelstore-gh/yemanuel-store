import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { OrderStatusEditor } from "@/components/admin/order-status-editor";
import { AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS, formatGhanaPhone } from "@/lib/format";
import { getOrderByNumber } from "@/lib/admin/sales";
import {
  deliveryStatusTone,
  fulfilmentStatusTone,
  orderPaymentStatusTone,
  orderStatusTone,
  paymentStatusTone,
  statusLabel,
} from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Order — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ orderNumber: string }>;
};

export default async function AdminOrderDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.sales.update);
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }

  const { orderNumber } = await params;
  const order = await getOrderByNumber(orderNumber);
  if (!order) notFound();

  const customerDisplay =
    order.customer !== null
      ? `${order.customer.firstName} ${order.customer.lastName}`
      : (order.guestName ?? "Guest");

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.orderNumber}
        description={`${customerDisplay} · ${order.channel} · ${new Date(
          order.createdAt,
        ).toLocaleString("en-GB")}`}
        actions={
          <>
            {order.customer && (
              <Link
                href={`/admin/customers/${order.customer.id}`}
                className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
              >
                Customer profile
              </Link>
            )}
            <AdminBadge tone={orderStatusTone(order.status)}>
              {statusLabel(order.status)}
            </AdminBadge>
          </>
        }
      />

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
          Operational status
        </h2>
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          <div>
            <p className="mb-1 text-[11px] font-medium text-ink-faint">Order status</p>
            {canUpdate ? (
              <OrderStatusEditor
                orderId={order.id}
                field="status"
                label="Order status"
                value={order.status}
                options={["confirmed", "processing", "ready_for_delivery", "out_for_delivery", "shipped", "delivered", "cancelled"]}
                tone={orderStatusTone}
              />
            ) : (
              <AdminBadge tone={orderStatusTone(order.status)}>
                {statusLabel(order.status)}
              </AdminBadge>
            )}
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium text-ink-faint">Payment status</p>
            {canUpdate ? (
              <OrderStatusEditor
                orderId={order.id}
                field="payment_status"
                label="Payment status"
                value={order.paymentStatus}
                options={["unpaid", "partially_paid", "paid", "refunded", "partially_refunded"]}
                tone={orderPaymentStatusTone}
              />
            ) : (
              <AdminBadge tone={orderPaymentStatusTone(order.paymentStatus)}>
                {statusLabel(order.paymentStatus)}
              </AdminBadge>
            )}
          </div>
          <div>
            <p className="mb-1 text-[11px] font-medium text-ink-faint">Fulfilment status</p>
            {canUpdate ? (
              <OrderStatusEditor
                orderId={order.id}
                field="fulfilment_status"
                label="Fulfilment status"
                value={order.fulfilmentStatus}
                options={["unfulfilled", "partially_fulfilled", "fulfilled"]}
                tone={fulfilmentStatusTone}
              />
            ) : (
              <AdminBadge tone={fulfilmentStatusTone(order.fulfilmentStatus)}>
                {statusLabel(order.fulfilmentStatus)}
              </AdminBadge>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Items — snapshot
          </h2>
        </div>
        <AdminTable
          head={
            <>
              <Th>Product</Th>
              <Th>Variant</Th>
              <Th>SKU</Th>
              <Th className="text-right">Qty</Th>
              <Th className="text-right">Unit price</Th>
              <Th className="text-right">Discount</Th>
              <Th className="text-right">Tax</Th>
              <Th className="text-right">Line total</Th>
            </>
          }
        >
          {order.items.map((item, index) => (
            <tr key={`${item.sku}-${index}`} className="transition-colors hover:bg-navy-soft/40">
              <Td className="font-medium">{item.productName}</Td>
              <Td className="text-ink-soft">{item.variantName}</Td>
              <Td>
                <span className="font-mono text-xs text-ink-soft">{item.sku}</span>
              </Td>
              <Td className="text-right">{item.quantity}</Td>
              <Td className="text-right text-ink-soft">{formatGHS(item.unitPrice)}</Td>
              <Td className="text-right text-ink-soft">
                {item.discountAmount > 0 ? `−${formatGHS(item.discountAmount)}` : "—"}
              </Td>
              <Td className="text-right text-ink-soft">
                {item.taxAmount > 0 ? formatGHS(item.taxAmount) : "—"}
              </Td>
              <Td className="text-right font-semibold">{formatGHS(item.lineTotal)}</Td>
            </tr>
          ))}
        </AdminTable>
        <dl className="flex flex-col gap-1.5 border-t border-line px-4 py-3 text-[13px]">
          <DataRow label="Subtotal" value={formatGHS(order.subtotal)} />
          {order.discountTotal > 0 && (
            <DataRow label="Discount" value={`−${formatGHS(order.discountTotal)}`} />
          )}
          {order.taxAmount > 0 && (
            <DataRow
              label={`Tax${order.taxRate !== null ? ` (${order.taxRate}%)` : ""}`}
              value={formatGHS(order.taxAmount)}
            />
          )}
          <DataRow
            label={`Delivery${order.deliveryMethodName ? ` (${order.deliveryMethodName})` : ""}`}
            value={formatGHS(order.deliveryFee)}
          />
          <div className="flex items-center justify-between border-t border-line pt-2">
            <dt className="text-sm font-semibold text-ink">Total</dt>
            <dd className="text-base font-semibold text-ink">{formatGHS(order.totalAmount)}</dd>
          </div>
        </dl>
      </div>

      {order.payments.length > 0 && (
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Payments</h2>
          </div>
          <AdminTable
            head={
              <>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th>Provider ref.</Th>
                <Th>Date</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
              </>
            }
          >
            {order.payments.map((payment, index) => (
              <tr key={index} className="transition-colors hover:bg-navy-soft/40">
                <Td className="capitalize">{statusLabel(payment.method)}</Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">
                    {payment.reference ?? "—"}
                  </span>
                </Td>
                <Td className="font-mono text-xs text-ink-soft">
                  {payment.providerReference ?? "—"}
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(payment.paymentDate).toLocaleDateString("en-GB")}
                </Td>
                <Td>
                  <AdminBadge tone={paymentStatusTone(payment.status)}>
                    {statusLabel(payment.status)}
                  </AdminBadge>
                </Td>
                <Td className="text-right font-semibold">{formatGHS(payment.amount)}</Td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}

      {order.deliveries.length > 0 && (
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Deliveries</h2>
          </div>
          <AdminTable
            head={
              <>
                <Th>Method</Th>
                <Th>Carrier</Th>
                <Th>Tracking</Th>
                <Th>Status</Th>
                <Th>Delivered</Th>
              </>
            }
          >
            {order.deliveries.map((delivery, index) => (
              <tr key={index} className="transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{delivery.methodName}</Td>
                <Td className="text-ink-soft">{delivery.carrier ?? "—"}</Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">
                    {delivery.trackingReference ?? "—"}
                  </span>
                </Td>
                <Td>
                  <AdminBadge tone={deliveryStatusTone(delivery.status)}>
                    {statusLabel(delivery.status)}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {delivery.deliveredAt
                    ? new Date(delivery.deliveredAt).toLocaleDateString("en-GB")
                    : "—"}
                </Td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Delivery information
          </h2>
          <dl className="mt-3">
            <DataRow
              label="Recipient"
              value={order.deliveryRecipient ?? customerDisplay}
            />
            <DataRow
              label="Phone"
              value={order.deliveryPhone ? formatGhanaPhone(order.deliveryPhone) : "—"}
            />
            <DataRow
              label="Address"
              value={[
                order.deliveryAddressLine1,
                order.deliveryAddressLine2,
                order.deliveryCity,
                order.deliveryRegion,
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            />
          </dl>
        </div>
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Billing information
          </h2>
          <dl className="mt-3">
            <DataRow
              label="Bill to"
              value={order.billToRecipient ?? customerDisplay}
            />
            <DataRow
              label="Phone"
              value={order.billToPhone ? formatGhanaPhone(order.billToPhone) : "—"}
            />
            <DataRow
              label="Address"
              value={[
                order.billToAddressLine1,
                order.billToAddressLine2,
                order.billToCity,
                order.billToRegion,
              ]
                .filter(Boolean)
                .join(", ") || "—"}
            />
          </dl>
        </div>
      </div>

      {order.notes && (
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Notes</h2>
          <p className="mt-2 text-[13px] leading-6 text-ink-soft">{order.notes}</p>
        </div>
      )}

      <Link
        href="/admin/orders"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All orders
      </Link>
    </div>
  );
}