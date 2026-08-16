import type { Metadata } from "next";
import Link from "next/link";
import { AdjustmentForm } from "@/components/admin/inventory-forms";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getAdjustments, getInventoryItemsForSelect } from "@/lib/admin/inventory";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { adjustmentStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Adjustments — Yemanuel Store Admin",
};

type SearchParams = Promise<{ page?: string }>;

export default async function AdminAdjustmentsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return <UnauthorizedPage message="Your account does not have the inventory.read permission." />;
  }
  const canAdjust = hasPermission(session, PERMISSIONS.inventory.adjust);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [result, inventoryItems] = await Promise.all([
    getAdjustments({ page }),
    canAdjust ? getInventoryItemsForSelect() : Promise.resolve([]),
  ]);

  const filterParams = new URLSearchParams();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock adjustments"
        description={`${result.total} adjustment${result.total === 1 ? "" : "s"}.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {result.adjustments.length === 0 ? (
          <AdminEmptyState
            title="No adjustments yet"
            message="Adjustments record signed corrections to stock levels."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Adjustment</Th>
                <Th>Reason</Th>
                <Th className="text-right">Items</Th>
                <Th>Date</Th>
                <Th>Status</Th>
              </>
            }
          >
            {result.adjustments.map((adjustment) => (
              <tr key={adjustment.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/inventory/adjustments/${adjustment.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {adjustment.adjustmentNumber}
                  </Link>
                </Td>
                <Td className="max-w-72 truncate text-ink-soft">{adjustment.reason}</Td>
                <Td className="text-right text-ink-soft">{adjustment.itemCount}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(adjustment.createdAt).toLocaleDateString("en-GB")}
                </Td>
                <Td>
                  <AdminBadge tone={adjustmentStatusTone(adjustment.status)}>
                    {statusLabel(adjustment.status)}
                  </AdminBadge>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/inventory/adjustments"
          searchParams={filterParams}
        />
      </div>

      {canAdjust && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            New adjustment
          </h2>
          <AdjustmentForm inventoryItems={inventoryItems} />
        </section>
      )}
    </div>
  );
}