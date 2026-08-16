import type { Metadata } from "next";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminTable, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getSupplierInvoiceById } from "@/lib/admin/purchasing";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { invoiceStatusTone, statusLabel } from "@/lib/admin/labels";
import { SupplierInvoiceStatusForm } from "@/components/admin/purchasing-forms";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Supplier Invoice — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminSupplierInvoiceDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.purchases.update);
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return <UnauthorizedPage message="Your account does not have the purchases.read permission." />;
  }

  const { id } = await params;
  const invoice = await getSupplierInvoiceById(id);
  if (!invoice) notFound();

  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = Math.max(0, invoice.amount - paid);

  return (
    <div className="space-y-6">
      <PageHeader
        title={invoice.invoiceNumber}
        description={invoice.supplier?.name ?? "Supplier not available"}
        actions={
          <AdminBadge tone={invoiceStatusTone(invoice.status)}>
            {statusLabel(invoice.status)}
          </AdminBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Overview</h2>
          <dl>
            <DataRow label="Invoice amount" value={formatGHS(invoice.amount)} />
            <DataRow label="Paid" value={formatGHS(paid)} />
            <DataRow label="Outstanding" value={formatGHS(outstanding)} />
            <DataRow
              label="Purchase order"
              value={
                invoice.poNumber ? (
                  <Link
                    href="/admin/purchases/orders"
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {invoice.poNumber}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <DataRow
              label="Invoiced"
              value={new Date(invoice.invoiceDate).toLocaleDateString("en-GB")}
            />
            <DataRow
              label="Due"
              value={invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "—"}
            />
            <DataRow label="Notes" value={invoice.notes ?? "—"} />
          </dl>
        </div>
        {canUpdate && (
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Status
            </h2>
            <SupplierInvoiceStatusForm invoiceId={invoice.id} current={invoice.status} />
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Payments against this invoice
          </h2>
        </div>
        {invoice.payments.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-soft">No payments recorded yet.</p>
        ) : (
          <AdminTable
            head={
              <>
                <Th>Date</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th className="text-right">Amount</Th>
              </>
            }
          >
            {invoice.payments.map((payment) => (
              <tr key={payment.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(payment.paymentDate).toLocaleDateString("en-GB")}
                </Td>
                <Td className="text-ink-soft">{payment.method.replaceAll("_", " ")}</Td>
                <Td className="text-ink-soft">{payment.reference ?? "—"}</Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(payment.amount)}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      <Link href="/admin/purchases/invoices" className="text-[11px] font-semibold text-navy hover:underline">
        ← All supplier invoices
      </Link>
    </div>
  );
}