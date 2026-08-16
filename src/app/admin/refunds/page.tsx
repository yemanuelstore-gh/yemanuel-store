import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { RefundForm } from "@/components/admin/return-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getRefunds, getOrdersForSelect, getReturnsForSelect } from "@/lib/admin/returns";
import { getPaymentsForRefundSelect } from "@/lib/admin/payments";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { refundStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Refunds — Yemanuel Store Admin",
};

type SearchParams = Promise<{ page?: string }>;

export default async function AdminRefundsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.sales.refund);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getRefunds({ page });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Refunds"
        description={`${result.total} refund${result.total === 1 ? "" : "s"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {result.refunds.length === 0 ? (
          <AdminEmptyState title="No refunds yet" message="Record the first refund to a customer." />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Refund</Th>
                <Th>Order</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th>Linked payment</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th>Date</Th>
              </>
            }
          >
            {result.refunds.map((refund) => (
              <tr key={refund.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/refunds/${refund.id}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {refund.refundNumber}
                  </Link>
                </Td>
                <Td className="font-mono text-xs text-ink-soft">{refund.orderNumber}</Td>
                <Td className="text-ink-soft">{refund.method.replaceAll("_", " ")}</Td>
                <Td className="text-ink-soft">{refund.reference ?? "—"}</Td>
                <Td className="font-mono text-xs text-ink-soft">
                  {refund.paymentReference ?? "—"}
                </Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(refund.amount)}
                </Td>
                <Td>
                  <AdminBadge tone={refundStatusTone(refund.status)}>
                    {statusLabel(refund.status)}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(refund.refundDate).toLocaleDateString("en-GB")}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination page={page} pageSize={25} total={result.total} basePath="/admin/refunds" />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Record a refund
          </h2>
          <RefundForm
            orders={await getOrdersForSelect()}
            returns={await getReturnsForSelect()}
            payments={await getPaymentsForRefundSelect()}
          />
        </section>
      )}
    </div>
  );
}