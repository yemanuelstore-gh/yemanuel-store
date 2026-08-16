import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { RefundStatusForm } from "@/components/admin/return-forms";
import { DataRow, PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getRefundById } from "@/lib/admin/returns";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { refundStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Refund — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminRefundDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.sales.refund);
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }

  const { id } = await params;
  const refund = await getRefundById(id);
  if (!refund) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={refund.refundNumber}
        description={`Order ${refund.orderNumber}`}
        actions={
          <AdminBadge tone={refundStatusTone(refund.status)}>
            {statusLabel(refund.status)}
          </AdminBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Overview</h2>
          <dl>
            <DataRow
              label="Order"
              value={
                <Link
                  href={`/admin/orders/${refund.orderNumber}`}
                  className="font-mono text-xs font-semibold text-navy hover:underline"
                >
                  {refund.orderNumber}
                </Link>
              }
            />
            <DataRow
              label="Linked return"
              value={
                refund.returnNumber ? (
                  <Link
                    href="/admin/returns"
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {refund.returnNumber}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <DataRow label="Amount" value={formatGHS(refund.amount)} />
            <DataRow label="Method" value={refund.method.replaceAll("_", " ")} />
            <DataRow label="Reference" value={refund.reference ?? "—"} />
            <DataRow
              label="Linked payment"
              value={
                refund.paymentReference ? (
                  <Link
                    href="/admin/payments"
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {refund.paymentReference}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <DataRow label="Reason" value={refund.reason ?? "—"} />
            <DataRow
              label="Recorded"
              value={new Date(refund.createdAt).toLocaleDateString("en-GB")}
            />
          </dl>
        </div>
        {canUpdate && (
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Status
            </h2>
            <RefundStatusForm refundId={refund.id} current={refund.status} />
          </div>
        )}
      </div>

      <Link href="/admin/refunds" className="text-[11px] font-semibold text-navy hover:underline">
        ← All refunds
      </Link>
    </div>
  );
}