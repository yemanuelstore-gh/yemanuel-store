import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { TransferForm } from "@/components/admin/inventory-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getLocations, getTransfers, getVariantsForSelect } from "@/lib/admin/inventory";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { statusLabel, transferStatusTone } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Transfers — Yemanuel Store Admin",
};

type SearchParams = Promise<{ page?: string }>;

export default async function AdminTransfersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return <UnauthorizedPage message="Your account does not have the inventory.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.inventory.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [result, locations, variants] = await Promise.all([
    getTransfers({ page }),
    getLocations(),
    getVariantsForSelect(),
  ]);

  const filterParams = new URLSearchParams();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock transfers"
        description={`${result.total} transfer${result.total === 1 ? "" : "s"}. Transfers document movement between locations.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {result.transfers.length === 0 ? (
          <AdminEmptyState
            title="No transfers yet"
            message="Create a transfer to move stock between locations."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Transfer</Th>
                <Th>From</Th>
                <Th>To</Th>
                <Th className="text-right">Units</Th>
                <Th>Date</Th>
                <Th>Status</Th>
              </>
            }
          >
            {result.transfers.map((transfer) => (
              <tr key={transfer.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/inventory/transfers/${transfer.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {transfer.transferNumber}
                  </Link>
                </Td>
                <Td className="text-ink-soft">{transfer.fromLocation}</Td>
                <Td className="text-ink-soft">{transfer.toLocation}</Td>
                <Td className="text-right text-ink-soft">{transfer.itemCount}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(transfer.createdAt).toLocaleDateString("en-GB")}
                </Td>
                <Td>
                  <AdminBadge tone={transferStatusTone(transfer.status)}>
                    {statusLabel(transfer.status)}
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
          basePath="/admin/inventory/transfers"
          searchParams={filterParams}
        />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            New transfer
          </h2>
          <TransferForm
            locations={locations.map((location) => ({
              id: location.id,
              name: location.name,
            }))}
            variants={variants}
          />
        </section>
      )}
    </div>
  );
}