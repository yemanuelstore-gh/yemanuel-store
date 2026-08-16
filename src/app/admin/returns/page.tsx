import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { ReturnForm } from "@/components/admin/return-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getReturns, getOrdersForSelect } from "@/lib/admin/returns";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { returnStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Returns — Yemanuel Store Admin",
};

type SearchParams = Promise<{ page?: string }>;

export default async function AdminReturnsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.sales.refund);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getReturns({ page });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Returns"
        description={`${result.total} return${result.total === 1 ? "" : "s"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {result.returns.length === 0 ? (
          <AdminEmptyState title="No returns yet" message="Record the first customer return." />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Return</Th>
                <Th>Order</Th>
                <Th>Reason</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Refund</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </>
            }
          >
            {result.returns.map((returnRow) => (
              <tr key={returnRow.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/returns/${returnRow.id}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {returnRow.returnNumber}
                  </Link>
                </Td>
                <Td className="font-mono text-xs text-ink-soft">{returnRow.orderNumber}</Td>
                <Td className="text-ink-soft">{returnRow.reason.replaceAll("_", " ")}</Td>
                <Td className="text-right text-ink-soft">{returnRow.itemCount}</Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {returnRow.refundTotal > 0 ? formatGHS(returnRow.refundTotal) : "—"}
                </Td>
                <Td>
                  <AdminBadge tone={returnStatusTone(returnRow.status)}>
                    {statusLabel(returnRow.status)}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(returnRow.returnDate).toLocaleDateString("en-GB")}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination page={page} pageSize={25} total={result.total} basePath="/admin/returns" />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            New return
          </h2>
          <ReturnForm orders={await getOrdersForSelect()} />
        </section>
      )}
    </div>
  );
}