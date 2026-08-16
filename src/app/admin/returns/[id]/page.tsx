import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { ReturnStatusForm } from "@/components/admin/return-forms";
import { AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getReturnById } from "@/lib/admin/returns";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import {
  itemConditionTone,
  refundStatusTone,
  returnStatusTone,
  statusLabel,
} from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Return — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminReturnDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.sales.refund);
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }

  const { id } = await params;
  const returnRow = await getReturnById(id);
  if (!returnRow) notFound();

  const refundTotal = returnRow.items.reduce(
    (sum, item) => sum + Number(item.refundAmount ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={returnRow.returnNumber}
        description={`Order ${returnRow.orderNumber}`}
        actions={
          <AdminBadge tone={returnStatusTone(returnRow.status)}>
            {statusLabel(returnRow.status)}
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
                  href={`/admin/orders/${returnRow.orderNumber}`}
                  className="font-mono text-xs font-semibold text-navy hover:underline"
                >
                  {returnRow.orderNumber}
                </Link>
              }
            />
            <DataRow label="Reason" value={returnRow.reason.replaceAll("_", " ")} />
            <DataRow label="Reason note" value={returnRow.reasonNote ?? "—"} />
            <DataRow
              label="Created"
              value={new Date(returnRow.createdAt).toLocaleDateString("en-GB")}
            />
            <DataRow label="Refund amount" value={formatGHS(refundTotal)} />
          </dl>
        </div>
        {canUpdate && (
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Status
            </h2>
            <ReturnStatusForm returnId={returnRow.id} current={returnRow.status} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Returned items
          </h2>
        </div>
        <AdminTable
          head={
            <>
              <Th>Variant</Th>
              <Th>SKU</Th>
              <Th className="text-right">Quantity</Th>
              <Th>Condition</Th>
              <Th className="text-right">Refund amount</Th>
            </>
          }
        >
          {returnRow.items.map((item) => (
            <tr key={item.id} className="transition-colors hover:bg-navy-soft/40">
              <Td className="font-medium">{item.variantName}</Td>
              <Td>
                <span className="font-mono text-xs text-ink-soft">{item.sku}</span>
              </Td>
              <Td className="text-right text-ink-soft">{item.quantityReturned}</Td>
              <Td>
                <AdminBadge tone={itemConditionTone(item.condition)}>
                  {statusLabel(item.condition)}
                </AdminBadge>
              </Td>
              <Td className="whitespace-nowrap text-right font-medium">
                {item.refundAmount !== null ? formatGHS(item.refundAmount) : "—"}
              </Td>
            </tr>
          ))}
        </AdminTable>
      </div>

      {returnRow.refunds.length > 0 && (
        <div className="rounded-lg border border-line bg-white">
          <div className="border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Refunds</h2>
          </div>
          <AdminTable
            head={
              <>
                <Th>Refund</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
              </>
            }
          >
            {returnRow.refunds.map((refund) => (
              <tr key={refund.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/refunds/${refund.id}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {refund.refundNumber}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(refund.amount)}
                </Td>
                <Td>
                  <AdminBadge tone={refundStatusTone(refund.status)}>
                    {statusLabel(refund.status)}
                  </AdminBadge>
                </Td>
              </tr>
            ))}
          </AdminTable>
        </div>
      )}

      <Link href="/admin/returns" className="text-[11px] font-semibold text-navy hover:underline">
        ← All returns
      </Link>
    </div>
  );
}