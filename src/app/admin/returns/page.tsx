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
import { listReturns, PAGE_SIZE, customerDisplayName } from "@/lib/admin/sales";
import { RETURN_STATUSES, RETURN_STATUS_LABELS, RETURN_REASON_LABELS, labelFor } from "@/lib/admin/labels";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Returns — Yemanuel Store ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return (
      <PageContainer>
        <PageHeader title="Returns" breadcrumb={[{ label: "Sales" }, { label: "Returns" }]} />
        <NoAccess module="returns" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listReturns(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Returns"
        description="Customer returns and refunds raised against orders."
        breadcrumb={[{ label: "Sales" }, { label: "Returns" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/returns"
          q={q}
          searchPlaceholder="Search return number…"
          count={`${total.toLocaleString()} return${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: RETURN_STATUSES.map((value) => ({
                value,
                label: labelFor(value, RETURN_STATUS_LABELS),
              })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="returns"
            title="No returns found"
            description={
              q || status
                ? "Try adjusting your search or filters."
                : "Customer returns raised against orders will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Return</TH>
                  <TH>Order</TH>
                  <TH>Customer</TH>
                  <TH>Reason</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((returnRow) => (
                  <TR key={returnRow.id}>
                    <TD className="font-medium text-erp-navy">{returnRow.return_number}</TD>
                    <TD>
                      {returnRow.orders?.order_number ?? "—"}
                    </TD>
                    <TD className="max-w-44">
                      <span className="block truncate">
                        {customerDisplayName(returnRow.customers)}
                      </span>
                    </TD>
                    <TD className="max-w-40 text-erp-text-secondary">
                      <span className="block truncate" title={returnRow.reason_note ?? undefined}>
                        {labelFor(returnRow.reason, RETURN_REASON_LABELS)}
                      </span>
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(returnRow.status, RETURN_STATUS_LABELS)} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDateTime(returnRow.created_at)}
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