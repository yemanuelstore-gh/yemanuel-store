import type { Metadata } from "next";
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
import { getActorNames, getStockMovements } from "@/lib/admin/inventory";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { movementTypeTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Stock Movements — Yemanuel Store Admin",
};

type SearchParams = Promise<{ page?: string }>;

export default async function AdminStockMovementsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return <UnauthorizedPage message="Your account does not have the inventory.read permission." />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getStockMovements({ page });

  const actorNames = await getActorNames(
    result.movements.map((movement) => movement.createdBy),
  );

  const filterParams = new URLSearchParams();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock movements"
        description={`${result.total} movements — this journal is append-only and cannot be edited.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {result.movements.length === 0 ? (
          <AdminEmptyState
            title="No movements yet"
            message="Purchase receipts, sales and adjustments will be logged here over time."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Date</Th>
                <Th>Type</Th>
                <Th>Variant</Th>
                <Th>Location</Th>
                <Th className="text-right">Quantity change</Th>
                <Th className="text-right">Unit cost</Th>
                <Th>Source</Th>
                <Th>Note</Th>
                <Th>Created by</Th>
              </>
            }
          >
            {result.movements.map((movement) => (
              <tr key={movement.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(movement.createdAt).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Td>
                <Td>
                  <AdminBadge tone={movementTypeTone(movement.movementType)}>
                    {statusLabel(movement.movementType)}
                  </AdminBadge>
                </Td>
                <Td>
                  <span className="font-medium text-ink">{movement.variantName}</span>
                  <span className="ml-1.5 font-mono text-[11px] text-ink-faint">
                    {movement.sku}
                  </span>
                </Td>
                <Td className="text-ink-soft">{movement.locationName}</Td>
                <Td
                  className={`text-right font-semibold ${
                    movement.quantityChange < 0 ? "text-danger" : "text-ink"
                  }`}
                >
                  {movement.quantityChange > 0 ? "+" : ""}
                  {movement.quantityChange}
                </Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {movement.unitCost !== null ? formatGHS(movement.unitCost) : "—"}
                </Td>
                <Td>
                  <span className="text-xs text-ink-soft">
                    {movement.sourceType}
                    {movement.sourceId !== "00000000-0000-0000-0000-000000000000" &&
                      ` · ${movement.sourceId.slice(0, 8)}`}
                  </span>
                </Td>
                <Td className="max-w-40 truncate text-xs text-ink-soft">
                  {movement.note ?? "—"}
                </Td>
                <Td className="whitespace-nowrap text-xs text-ink-soft">
                  {actorNames.get(movement.createdBy) ?? movement.createdBy.slice(0, 8)}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={50}
          total={result.total}
          basePath="/admin/inventory/movements"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}