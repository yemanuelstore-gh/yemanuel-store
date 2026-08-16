import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { PurchaseOrderStatusForm } from "@/components/admin/purchasing-forms";
import { AdminEmptyState, AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getPurchaseOrderById } from "@/lib/admin/purchasing";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import {
  goodsReceiptStatusTone,
  invoiceStatusTone,
  purchaseOrderStatusTone,
  statusLabel,
} from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Purchase Order — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminPurchaseOrderDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.purchases.update);
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return <UnauthorizedPage message="Your account does not have the purchases.read permission." />;
  }

  const { id } = await params;
  const order = await getPurchaseOrderById(id);
  if (!order) notFound();

  const expectedTotal = order.items.reduce((sum, item) => sum + item.lineExpected, 0);
  const totalReceived = order.items.reduce((sum, item) => sum + item.quantityReceived, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.poNumber}
        description={
          order.supplier ? `${order.supplier.name} · ${order.supplier.supplierCode}` : "Supplier not available"
        }
        actions={
          <AdminBadge tone={purchaseOrderStatusTone(order.status)}>
            {statusLabel(order.status)}
          </AdminBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Overview</h2>
          <dl>
            <DataRow
              label="Supplier"
              value={
                order.supplier ? (
                  <Link href={`/admin/suppliers/${order.supplier.id}`} className="text-navy hover:underline">
                    {order.supplier.name}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <DataRow label="Receiving location" value={order.location?.name ?? "—"} />
            <DataRow
              label="Expected delivery"
              value={
                order.expectedDate
                  ? new Date(order.expectedDate).toLocaleDateString("en-GB")
                  : "—"
              }
            />
            <DataRow
              label="Created"
              value={new Date(order.createdAt).toLocaleDateString("en-GB")}
            />
            <DataRow label="Notes" value={order.notes ?? "—"} />
            <DataRow label="Expected total" value={formatGHS(expectedTotal)} />
            <DataRow label="Units received" value={`${totalReceived} / ${order.items.reduce((sum, item) => sum + item.quantityOrdered, 0)}`} />
          </dl>
        </div>
        {canUpdate && (
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Status
            </h2>
            <PurchaseOrderStatusForm poId={order.id} current={order.status} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Line items</h2>
        </div>
        <AdminTable
          head={
            <>
              <Th>Variant</Th>
              <Th>SKU</Th>
              <Th className="text-right">Ordered</Th>
              <Th className="text-right">Unit cost</Th>
              <Th className="text-right">Received</Th>
              <Th className="text-right">Expected total</Th>
            </>
          }
        >
          {order.items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-navy-soft/40">
              <Td className="font-medium">{item.variantName}</Td>
              <Td>
                <span className="font-mono text-xs text-ink-soft">{item.sku}</span>
              </Td>
              <Td className="text-right text-ink-soft">{item.quantityOrdered}</Td>
              <Td className="whitespace-nowrap text-right text-ink-soft">
                {formatGHS(item.unitCostExpected)}
              </Td>
              <Td className="text-right text-ink-soft">{item.quantityReceived}</Td>
              <Td className="whitespace-nowrap text-right font-medium">
                {formatGHS(item.lineExpected)}
              </Td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Goods receipts
            </h2>
          </div>
          {order.receipts.length === 0 ? (
            <AdminEmptyState title="No receipts yet" message="Receive stock against this order." />
          ) : (
            <AdminTable
              head={
                <>
                  <Th>Receipt</Th>
                  <Th>Status</Th>
                  <Th>Date</Th>
                </>
              }
            >
              {order.receipts.map((receipt) => (
                <tr key={receipt.id} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <Link
                      href={`/admin/purchases/receipts/${receipt.id}`}
                      className="font-mono text-xs font-semibold text-navy hover:underline"
                    >
                      {receipt.receiptNumber}
                    </Link>
                  </Td>
                  <Td>
                    <AdminBadge tone={goodsReceiptStatusTone(receipt.status)}>
                      {statusLabel(receipt.status)}
                    </AdminBadge>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {new Date(receipt.receivedDate).toLocaleDateString("en-GB")}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          )}
        </div>
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Invoices & payments
            </h2>
          </div>
          {order.invoices.length === 0 && order.payments.length === 0 ? (
            <AdminEmptyState title="Nothing recorded" message="Link an invoice or record a payment." />
          ) : (
            <div className="divide-y divide-line">
              {order.invoices.map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between px-4 py-2.5">
                  <Link
                    href={`/admin/purchases/invoices/${invoice.id}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{formatGHS(invoice.amount)}</span>
                    <AdminBadge tone={invoiceStatusTone(invoice.status)}>
                      {statusLabel(invoice.status)}
                    </AdminBadge>
                  </div>
                </div>
              ))}
              {order.payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-xs text-ink-soft">
                    Payment · {new Date(payment.paymentDate).toLocaleDateString("en-GB")}
                    {payment.reference ? ` · ${payment.reference}` : ""}
                  </span>
                  <span className="text-xs font-medium">{formatGHS(payment.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Link href="/admin/purchases/orders" className="text-[11px] font-semibold text-navy hover:underline">
        ← All purchase orders
      </Link>
    </div>
  );
}