import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCardSection, AdminEmptyState, AdminTable, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { getCustomerReceivables } from "@/lib/admin/receivables";
import { agingBucketTone, formatDateLabel } from "@/lib/admin/reporting";
import { formatGHS, formatGhanaPhone } from "@/lib/format";
import { customerStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Customer Receivables — Yemanuel Store Admin",
};

export default async function AdminCustomerReceivablesPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }

  const { customerId } = await params;
  const data = await getCustomerReceivables(customerId);
  if (!data) return null;

  const { customer, rows } = data;
  const totalOutstanding = rows.reduce((sum, row) => sum + row.outstanding, 0);
  const totalInvoiced = rows.reduce((sum, row) => sum + row.totalAmount, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={customer ? `${customer.firstName} ${customer.lastName}` : "Customer"}
        description={
          customer
            ? `${customer.customerCode} · ${customer.businessName ?? "Individual customer"}`
            : "Receivables for this customer."
        }
        actions={
          <Link
            href="/admin/receivables"
            className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
          >
            ← Back to Receivables
          </Link>
        }
      />

      {customer && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white px-4 py-3 text-xs text-ink-soft">
          <span>
            Phone:{" "}
            <span className="font-medium text-ink">{formatGhanaPhone(customer.phone)}</span>
          </span>
          {customer.email && (
            <span>
              Email: <span className="font-medium text-ink">{customer.email}</span>
            </span>
          )}
          <AdminBadge tone={customerStatusTone(customer.status)}>
            {statusLabel(customer.status)}
          </AdminBadge>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Invoiced"
          value={formatGHS(totalInvoiced)}
          note={`${rows.length} outstanding order${rows.length === 1 ? "" : "s"}`}
        />
        <KpiCard
          label="Paid"
          value={formatGHS(totalPaid)}
          note="Payments in paid / authorized status"
        />
        <KpiCard
          label="Outstanding"
          value={formatGHS(totalOutstanding)}
          tone={totalOutstanding > 0 ? "danger" : "default"}
        />
      </div>

      <AdminCardSection title="Outstanding orders">
        {rows.length === 0 ? (
          <AdminEmptyState
            title="No outstanding orders"
            message="This customer has no unpaid or partially paid orders."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Order</Th>
                <Th>Date</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Paid</Th>
                <Th className="text-right">Outstanding</Th>
                <Th>Age</Th>
              </>
            }
          >
            {rows.map((row) => (
              <tr key={row.orderId} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/orders/${row.orderNumber}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {row.orderNumber}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {formatDateLabel(row.createdAt)}
                </Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {formatGHS(row.totalAmount)}
                </Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {formatGHS(row.paidAmount)}
                </Td>
                <Td className="whitespace-nowrap text-right font-semibold text-danger">
                  {formatGHS(row.outstanding)}
                </Td>
                <Td>
                  <AdminBadge tone={agingBucketTone(row.agingBucket)}>
                    {row.ageDays}d
                  </AdminBadge>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </AdminCardSection>
    </div>
  );
}