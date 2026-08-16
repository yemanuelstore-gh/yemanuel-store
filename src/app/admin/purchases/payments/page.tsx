import type { Metadata } from "next";
import { PurchasePaymentForm } from "@/components/admin/purchasing-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getPurchaseOrders, getPurchasePayments, getSupplierInvoices } from "@/lib/admin/purchasing";
import { getSuppliers } from "@/lib/admin/suppliers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Purchase Payments — Yemanuel Store Admin",
};

type SearchParams = Promise<{ page?: string }>;

export default async function AdminPurchasePaymentsPage({
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
  const result = await getPurchasePayments({ page });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Purchase Payments"
        description={`${result.payments.length} payment${result.payments.length === 1 ? "" : "s"} shown · page ${page}`}
      />

      <div className="rounded-lg border border-line bg-white">
        {result.payments.length === 0 ? (
          <AdminEmptyState
            title="No payments recorded"
            message="Record the first payment made to a supplier."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Date</Th>
                <Th>Supplier</Th>
                <Th>Invoice</Th>
                <Th>PO</Th>
                <Th>Method</Th>
                <Th>Reference</Th>
                <Th className="text-right">Amount</Th>
              </>
            }
          >
            {result.payments.map((payment) => (
              <tr key={payment.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(payment.paymentDate).toLocaleDateString("en-GB")}
                </Td>
                <Td className="font-medium">{payment.supplierName}</Td>
                <Td className="font-mono text-xs text-ink-soft">
                  {payment.invoiceNumber ?? "—"}
                </Td>
                <Td className="font-mono text-xs text-ink-soft">{payment.poNumber ?? "—"}</Td>
                <Td className="text-ink-soft">{payment.method.replaceAll("_", " ")}</Td>
                <Td className="text-ink-soft">{payment.reference ?? "—"}</Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(payment.amount)}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/purchases/payments"
        />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Record a payment
          </h2>
          <PurchasePaymentForm
            suppliers={(await getSuppliers({ pageSize: 500 })).suppliers}
            invoices={(await getSupplierInvoices({ pageSize: 500 })).invoices}
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