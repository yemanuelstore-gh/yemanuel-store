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
import { listPayments, PAGE_SIZE } from "@/lib/admin/treasury";
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, labelFor } from "@/lib/admin/labels";
import { formatDate, formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payments — Yemanuel ERP",
};

const PAYMENT_METHODS = ["cash", "mobile_money", "card", "bank_transfer", "other"];
const PAYMENT_STATUSES = ["paid", "authorized", "pending", "failed", "refunded", "cancelled"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.finance.read)) {
    return (
      <PageContainer>
        <PageHeader title="Payments" breadcrumb={[{ label: "Finance" }, { label: "Payments" }]} />
        <NoAccess module="payments" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const method = firstParam(params.method);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listPayments(client, {
    page,
    pageSize: PAGE_SIZE,
    q,
    method,
    status,
  });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (method) urlParams.set("method", method);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Payments"
        description="Payments received from customers for orders."
        breadcrumb={[{ label: "Finance" }, { label: "Payments" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/payments"
          q={q}
          searchPlaceholder="Search reference or order number…"
          count={`${total.toLocaleString()} payment${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "method",
              label: "method",
              value: method,
              options: PAYMENT_METHODS.map((value) => ({
                value,
                label: labelFor(value, PAYMENT_METHOD_LABELS),
              })),
            },
            {
              name: "status",
              label: "status",
              value: status,
              options: PAYMENT_STATUSES.map((value) => ({
                value,
                label: labelFor(value, PAYMENT_STATUS_LABELS),
              })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="payments"
            title="No payments found"
            description={
              q || method || status
                ? "Try adjusting your search or filters."
                : "Payments received from customers will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Payment Date</TH>
                  <TH>Order</TH>
                  <TH>Method</TH>
                  <TH>Reference</TH>
                  <TH>Provider</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((payment) => (
                  <TR key={payment.id}>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(payment.payment_date)}
                    </TD>
                    <TD className="text-erp-navy">
                      {payment.orders?.order_number ?? "—"}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(payment.method, PAYMENT_METHOD_LABELS)} />
                    </TD>
                    <TD className="max-w-40">
                      <span className="block truncate font-mono text-[12px] text-erp-text-secondary">
                        {payment.reference ?? "—"}
                      </span>
                    </TD>
                    <TD className="max-w-36">
                      <span className="block truncate text-erp-text-secondary">
                        {payment.provider ?? "—"}
                      </span>
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {formatGHS(payment.amount ?? 0)}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(payment.status, PAYMENT_STATUS_LABELS)} />
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