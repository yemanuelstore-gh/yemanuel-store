import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/status-badge";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { listSupplierInvoices, PAGE_SIZE } from "@/lib/admin/purchasing";
import { INVOICE_STATUS_LABELS, labelFor } from "@/lib/admin/labels";
import { formatDate, formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Supplier Invoices — Yemanuel Store ERP",
};

const INVOICE_STATUSES = ["pending", "partially_paid", "paid", "cancelled"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function SupplierInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return (
      <PageContainer>
        <PageHeader
          title="Supplier Invoices"
          breadcrumb={[{ label: "Purchasing" }, { label: "Supplier Invoices" }]}
        />
        <NoAccess module="supplier invoices" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listSupplierInvoices(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Supplier Invoices"
        description="Invoices received from suppliers for goods and services."
        breadcrumb={[{ label: "Purchasing" }, { label: "Supplier Invoices" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/purchases/invoices"
          q={q}
          searchPlaceholder="Search invoice number or supplier…"
          count={`${total.toLocaleString()} invoice${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: INVOICE_STATUSES.map((value) => ({
                value,
                label: labelFor(value, INVOICE_STATUS_LABELS),
              })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="invoices"
            title="No supplier invoices found"
            description={
              q || status
                ? "Try adjusting your search or filters."
                : "Invoices received from suppliers will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Invoice</TH>
                  <TH>Supplier</TH>
                  <TH>Purchase Order</TH>
                  <TH>Invoice Date</TH>
                  <TH>Due Date</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((invoice) => (
                  <TR key={invoice.id}>
                    <TD className="font-medium text-erp-navy">{invoice.invoice_number}</TD>
                    <TD className="max-w-52">
                      <span className="block truncate text-erp-text-secondary">
                        {invoice.suppliers?.name ?? "—"}
                      </span>
                    </TD>
                    <TD className="text-erp-text-secondary">
                      {invoice.purchase_orders?.po_number ?? "—"}
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(invoice.invoice_date)}
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(invoice.due_date)}
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {formatGHS(invoice.amount ?? 0)}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(invoice.status, INVOICE_STATUS_LABELS)} />
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <Pagination params={urlParams} page={page} total={total} />
          </>
        )}
      </Card>
    </PageContainer>
  );
}