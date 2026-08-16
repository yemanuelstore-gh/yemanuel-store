import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { GoodsReceiptStatusForm } from "@/components/admin/purchasing-forms";
import { AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getGoodsReceiptById } from "@/lib/admin/purchasing";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { goodsReceiptStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Goods Receipt — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminGoodsReceiptDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.purchases.update);
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return <UnauthorizedPage message="Your account does not have the purchases.read permission." />;
  }

  const { id } = await params;
  const receipt = await getGoodsReceiptById(id);
  if (!receipt) notFound();

  const totalValue = receipt.items.reduce((sum, item) => sum + item.lineTotal, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={receipt.receiptNumber}
        description={receipt.poNumber ? `Against ${receipt.poNumber}` : "Not linked to a purchase order"}
        actions={
          <AdminBadge tone={goodsReceiptStatusTone(receipt.status)}>
            {statusLabel(receipt.status)}
          </AdminBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Overview</h2>
          <dl>
            <DataRow
              label="Purchase order"
              value={
                receipt.purchaseOrderId ? (
                  <Link
                    href={`/admin/purchases/orders/${receipt.purchaseOrderId}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {receipt.poNumber}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <DataRow label="Location" value={receipt.locationName} />
            <DataRow
              label="Received"
              value={new Date(receipt.receivedDate).toLocaleDateString("en-GB")}
            />
            <DataRow label="Notes" value={receipt.notes ?? "—"} />
            <DataRow label="Total received value" value={formatGHS(totalValue)} />
          </dl>
        </div>
        {canUpdate && (
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Status
            </h2>
            <GoodsReceiptStatusForm receiptId={receipt.id} current={receipt.status} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Received items
          </h2>
        </div>
        <AdminTable
          head={
            <>
              <Th>Variant</Th>
              <Th>SKU</Th>
              <Th className="text-right">Quantity</Th>
              <Th className="text-right">Unit cost</Th>
              <Th className="text-right">Line total</Th>
            </>
          }
        >
          {receipt.items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-navy-soft/40">
              <Td className="font-medium">{item.variantName}</Td>
              <Td>
                <span className="font-mono text-xs text-ink-soft">{item.sku}</span>
              </Td>
              <Td className="text-right text-ink-soft">{item.quantityReceived}</Td>
              <Td className="whitespace-nowrap text-right text-ink-soft">
                {formatGHS(item.unitCostActual)}
              </Td>
              <Td className="whitespace-nowrap text-right font-medium">
                {formatGHS(item.lineTotal)}
              </Td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <p className="text-[11px] text-ink-faint">
        Goods receipts document inbound stock. Movement quantities are posted to stock movements
        when the receipt is completed.
      </p>

      <Link href="/admin/purchases/receipts" className="text-[11px] font-semibold text-navy hover:underline">
        ← All goods receipts
      </Link>
    </div>
  );
}