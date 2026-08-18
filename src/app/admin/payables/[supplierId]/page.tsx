import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCardSection, AdminEmptyState, AdminTable, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { getSupplierPayables } from "@/lib/admin/payables";
import { agingBucketTone, formatDateLabel } from "@/lib/admin/reporting";
import { formatGHS, formatGhanaPhone } from "@/lib/format";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Supplier Payables — Yemanuel Store Admin",
};

export default async function AdminSupplierPayablesPage({
  params,
}: {
  params: Promise<{ supplierId: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the purchases.read permission." />
    );
  }

  const { supplierId } = await params;
  const data = await getSupplierPayables(supplierId);
  if (!data) return null;

  const { supplier, rows } = data;
  const totalInvoiced = rows.reduce((sum, row) => sum + row.amount, 0);
  const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0);
  const totalOutstanding = rows.reduce((sum, row) => sum + row.outstanding, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title={supplier?.name ?? "Supplier"}
        description={supplier ? `${supplier.supplierCode} · outstanding invoices` : undefined}
        actions={
          <Link
            href="/admin/payables"
            className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
          >
            ← Back to Payables
          </Link>
        }
      />

      {supplier && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-line bg-white px-4 py-3 text-xs text-ink-soft">
          <span>
            Phone: <span className="font-medium text-ink">{formatGhanaPhone(supplier.phone)}</span>
          </span>
          {supplier.email && (
            <span>
              Email: <span className="font-medium text-ink">{supplier.email}</span>
            </span>
          )}
          {supplier.paymentTermsDays !== null && (
            <span>
              Payment terms:{" "}
              <span className="font-medium text-ink">{supplier.paymentTermsDays} days</span>
            </span>
          )}
          <AdminBadge tone={entityStatusTone(supplier.status)}>
            {statusLabel(supplier.status)}
          </AdminBadge>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiCard
          label="Invoiced"
          value={formatGHS(totalInvoiced)}
          note={`${rows.length} outstanding invoice${rows.length === 1 ? "" : "s"}`}
        />
        <KpiCard label="Paid" value={formatGHS(totalPaid)} note="Purchase payments against these invoices" />
        <KpiCard
          label="Outstanding"
          value={formatGHS(totalOutstanding)}
          tone={totalOutstanding > 0 ? "danger" : "default"}
        />
      </div>

      <AdminCardSection title="Outstanding invoices">
        {rows.length === 0 ? (
          <AdminEmptyState
            title="No outstanding invoices"
            message="This supplier has no pending or partially paid invoices."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Invoice</Th>
                <Th>Invoice date</Th>
                <Th>Due date</Th>
                <Th className="text-right">Amount</Th>
                <Th className="text-right">Paid</Th>
                <Th className="text-right">Outstanding</Th>
                <Th>Age</Th>
              </>
            }
          >
            {rows.map((row) => (
              <tr key={row.invoiceId} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/purchases/invoices/${row.invoiceId}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {row.invoiceNumber}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {formatDateLabel(row.invoiceDate)}
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {row.dueDate ? formatDateLabel(row.dueDate) : "—"}
                </Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {formatGHS(row.amount)}
                </Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {formatGHS(row.paidAmount)}
                </Td>
                <Td className="whitespace-nowrap text-right font-semibold text-danger">
                  {formatGHS(row.outstanding)}
                </Td>
                <Td>
                  <AdminBadge tone={agingBucketTone(row.agingBucket)}>
                    {row.overdueDays === 0 ? "Not due" : `${row.overdueDays}d overdue`}
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