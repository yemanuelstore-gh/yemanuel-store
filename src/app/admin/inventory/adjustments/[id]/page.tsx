import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdjustmentStatusForm } from "@/components/admin/inventory-forms";
import { AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getActorNames, getAdjustmentById } from "@/lib/admin/inventory";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { adjustmentStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Adjustment — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdjustmentDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canAdjust = hasPermission(session, PERMISSIONS.inventory.adjust);
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return <UnauthorizedPage message="Your account does not have the inventory.read permission." />;
  }

  const { id } = await params;
  const adjustment = await getAdjustmentById(id);
  if (!adjustment) notFound();

  const actorNames = await getActorNames([adjustment.created_by]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={adjustment.adjustment_number}
        description={`Created ${new Date(adjustment.created_at).toLocaleString("en-GB")} by ${
          actorNames.get(adjustment.created_by) ?? adjustment.created_by.slice(0, 8)
        }`}
        actions={
          <AdminBadge tone={adjustmentStatusTone(adjustment.status)}>
            {statusLabel(adjustment.status)}
          </AdminBadge>
        }
      />

      <div className="rounded-lg border border-line bg-white p-5">
        <dl className="max-w-xl">
          <DataRow label="Reason" value={adjustment.reason} />
        </dl>
        {canAdjust && adjustment.status === "draft" && (
          <div className="mt-4 border-t border-line pt-4">
            <AdjustmentStatusForm adjustmentId={adjustment.id} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Items — signed quantities
          </h2>
        </div>
        <AdminTable
          head={
            <>
              <Th>Variant</Th>
              <Th>Location</Th>
              <Th className="text-right">On hand</Th>
              <Th className="text-right">Change</Th>
              <Th>Reason</Th>
            </>
          }
        >
          {adjustment.stock_adjustment_items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-navy-soft/40">
              <Td>
                <span className="font-medium">{item.inventory_items?.product_variants?.name ?? "—"}</span>
                <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
                  {item.inventory_items?.product_variants?.sku ?? "—"}
                </span>
              </Td>
              <Td className="text-ink-soft">{item.inventory_items?.locations?.name ?? "—"}</Td>
              <Td className="text-right text-ink-soft">
                {item.inventory_items?.quantity_on_hand ?? "—"}
              </Td>
              <Td
                className={`text-right font-semibold ${
                  item.quantity_change < 0 ? "text-danger" : "text-ink"
                }`}
              >
                {item.quantity_change > 0 ? "+" : ""}
                {item.quantity_change}
              </Td>
              <Td className="max-w-56 truncate text-xs text-ink-soft">{item.reason}</Td>
            </tr>
          ))}
        </AdminTable>
      </div>

      <p className="text-[11px] leading-5 text-ink-faint">
        Note: applying an adjustment records its status on this document. The
        database does not automatically change quantities — stock corrections
        are reconciled through stock movements.
      </p>

      <Link
        href="/admin/inventory/adjustments"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All adjustments
      </Link>
    </div>
  );
}