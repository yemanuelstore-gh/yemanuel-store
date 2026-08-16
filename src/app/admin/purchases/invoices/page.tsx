import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { SupplierInvoiceForm } from "@/components/admin/purchasing-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getPurchaseOrders, getSupplierInvoices } from "@/lib/admin/purchasing";
import { getSuppliers } from "@/lib/admin/suppliers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { invoiceStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Supplier Invoices — Yemanuel Store Admin",
};

type SearchParams = Promise<{ page?: string }>;

export default async function AdminSupplierInvoicesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return <UnauthorizedPage message="Your account does not have the purchases.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.purchases.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getSupplierInvoices({ page });

  const outstanding = result.invoices
    .filter((invoice) => invoice.status === "pending" || invoice.status === "partially_paid")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Supplier Invoices"
        description={`${result.total} invoice${result.total === 1 ? "" : "s"} on record · ${formatGHS(outstanding)} outstanding`}
      />

      <div className="rounded-lg border border-line bg-white">
        {result.invoices.length === 0 ? (
          <AdminEmptyState
            title="No supplier invoices yet"
            message="Record the first supplier invoice for purchases."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Invoice</Th>
                <Th>Supplier</Th>
                <Th>Invoiced</Th>
                <Th>Due</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
              </>
            }
          >
            {result.invoices.map((invoice) => (
              <tr key={invoice.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/purchases/invoices/${invoice.id}`}
                    className="font-mono text-xs font-semibold text-navy hover:underline"
                  >
                    {invoice.invoiceNumber}
                  </Link>
                </Td>
                <Td className="font-medium">{invoice.supplierName}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(invoice.invoiceDate).toLocaleDateString("en-GB")}
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "—"}
                </Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(invoice.amount)}
                </Td>
                <Td>
                  <AdminBadge tone={invoiceStatusTone(invoice.status)}>
                    {statusLabel(invoice.status)}
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
          basePath="/admin/purchases/invoices"
        />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Record a supplier invoice
          </h2>
          <SupplierInvoiceForm
            suppliers={(await getSuppliers({ pageSize: 500 })).suppliers}
            purchaseOrders={(await getPurchaseOrders({ pageSize: 500 })).orders.map((order) => ({
              id: order.id,
              poNumber: order.poNumber,
              supplierName: order.supplierName,
            }))}
          />
        </section>
      )}
    </div>
  );
}