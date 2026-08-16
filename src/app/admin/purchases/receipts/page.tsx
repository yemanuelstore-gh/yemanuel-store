import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { GoodsReceiptForm } from "@/components/admin/purchasing-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getGoodsReceipts, getPurchaseOrders } from "@/lib/admin/purchasing";
import { getLocations, getVariantsForSelect } from "@/lib/admin/inventory";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { goodsReceiptStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Goods Receipts — Yemanuel Store Admin",
};

type SearchParams = Promise<{ page?: string }>;

export default async function AdminGoodsReceiptsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return <UnauthorizedPage message="Your account does not have the purchases.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.purchases.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getGoodsReceipts({ page });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Goods Receipts"
        description={`${result.total} receipt${result.total === 1 ? "" : "s"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {result.receipts.length === 0 ? (
          <AdminEmptyState
            title="No goods receipts yet"
            message="Record the first receipt of stock into a location."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Receipt number</Th>
                <Th>PO</Th>
                <Th>Location</Th>
                <Th>Status</Th>
                <Th className="text-right">Units</Th>
                <Th>Received</Th>
              </>
            }
          >
            {result.receipts.map((receipt) => (
              <tr key={receipt.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/purchases/receipts/${receipt.id}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {receipt.receiptNumber}
                  </Link>
                </Td>
                <Td className="font-mono text-xs text-ink-soft">{receipt.poNumber ?? "—"}</Td>
                <Td className="text-ink-soft">{receipt.locationName}</Td>
                <Td>
                  <AdminBadge tone={goodsReceiptStatusTone(receipt.status)}>
                    {statusLabel(receipt.status)}
                  </AdminBadge>
                </Td>
                <Td className="text-right text-ink-soft">{receipt.itemCount}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(receipt.receivedDate).toLocaleDateString("en-GB")}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/purchases/receipts"
        />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Record a receipt
          </h2>
          <GoodsReceiptForm
            purchaseOrders={(await getPurchaseOrders({ pageSize: 500 })).orders.map((order) => ({
              id: order.id,
              poNumber: order.poNumber,
              supplierName: order.supplierName,
            }))}
            locations={await getLocations()}
            variants={await getVariantsForSelect()}
          />
        </section>
      )}
    </div>
  );
}