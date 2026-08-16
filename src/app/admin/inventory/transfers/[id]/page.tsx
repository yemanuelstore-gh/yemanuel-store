import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  TransferItemStatusForm,
  TransferStatusForm,
} from "@/components/admin/inventory-forms";
import { AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getActorNames, getTransferById } from "@/lib/admin/inventory";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { statusLabel, transferItemStatusTone, transferStatusTone } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Transfer — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TransferDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.inventory.update);
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return <UnauthorizedPage message="Your account does not have the inventory.read permission." />;
  }

  const { id } = await params;
  const transfer = await getTransferById(id);
  if (!transfer) notFound();

  const [actorNames] = await Promise.all([getActorNames([transfer.created_by])]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={transfer.transfer_number}
        description={`Created ${new Date(transfer.created_at).toLocaleString("en-GB")} by ${
          actorNames.get(transfer.created_by) ?? transfer.created_by.slice(0, 8)
        }`}
        actions={
          <AdminBadge tone={transferStatusTone(transfer.status)}>
            {statusLabel(transfer.status)}
          </AdminBadge>
        }
      />

      <div className="rounded-lg border border-line bg-white p-5">
        <dl className="grid gap-x-8 sm:grid-cols-2">
          <DataRow
            label="From location"
            value={transfer.from_locations?.name ?? "—"}
          />
          <DataRow label="To location" value={transfer.to_locations?.name ?? "—"} />
          <DataRow label="Notes" value={transfer.notes ?? "—"} />
        </dl>
        {canUpdate && transfer.status === "draft" && (
          <div className="mt-4 border-t border-line pt-4">
            <TransferStatusForm transferId={transfer.id} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Items</h2>
        </div>
        <AdminTable
          head={
            <>
              <Th>Variant</Th>
              <Th>SKU</Th>
              <Th className="text-right">Quantity</Th>
              <Th>Status</Th>
              {canUpdate && <Th className="text-right">Actions</Th>}
            </>
          }
        >
          {transfer.stock_transfer_items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-navy-soft/40">
              <Td className="font-medium">{item.product_variants?.name ?? "—"}</Td>
              <Td>
                <span className="font-mono text-xs text-ink-soft">
                  {item.product_variants?.sku ?? "—"}
                </span>
              </Td>
              <Td className="text-right font-semibold">{item.quantity}</Td>
              <Td>
                <AdminBadge tone={transferItemStatusTone(item.status)}>
                  {statusLabel(item.status)}
                </AdminBadge>
              </Td>
              {canUpdate && (
                <Td className="text-right">
                  {transfer.status !== "cancelled" && item.status !== "received" && (
                    <TransferItemStatusForm
                      itemId={item.id}
                      currentStatus={item.status}
                    />
                  )}
                </Td>
              )}
            </tr>
          ))}
        </AdminTable>
      </div>

      <p className="text-[11px] leading-5 text-ink-faint">
        Note: updating transfer statuses records progress on this document. The
        database does not automatically move stock quantities — warehouse
        operations reconcile quantities through receipts and adjustments.
      </p>

      <Link
        href="/admin/inventory/transfers"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All transfers
      </Link>
    </div>
  );
}