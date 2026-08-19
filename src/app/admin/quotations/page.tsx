import type { Metadata } from "next";
import Link from "next/link";
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
import { listQuotations, PAGE_SIZE, customerDisplayName } from "@/lib/admin/sales";
import { QUOTATION_STATUSES, QUOTATION_STATUS_LABELS, labelFor } from "@/lib/admin/labels";
import { formatGHS, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quotations — Yemanuel Store ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return (
      <PageContainer>
        <PageHeader title="Quotations" breadcrumb={[{ label: "Sales" }, { label: "Quotations" }]} />
        <NoAccess module="quotations" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listQuotations(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Quotations"
        description="Price quotes shared with customers before they order."
        breadcrumb={[{ label: "Sales" }, { label: "Quotations" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/quotations"
          q={q}
          searchPlaceholder="Search quotation number or guest…"
          count={`${total.toLocaleString()} quotation${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: QUOTATION_STATUSES.map((value) => ({
                value,
                label: labelFor(value, QUOTATION_STATUS_LABELS),
              })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="quotations"
            title="No quotations found"
            description={
              q || status
                ? "Try adjusting your search or filters."
                : "Quotations shared with customers will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Quotation</TH>
                  <TH>Customer</TH>
                  <TH>Date</TH>
                  <TH>Valid until</TH>
                  <TH className="text-right">Amount</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((quotation) => (
                  <TR key={quotation.id}>
                    <TD className="font-medium text-erp-navy">
                      <Link
                        href={`/admin/quotations/${quotation.quotation_number}`}
                        className="hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                      >
                        {quotation.quotation_number}
                      </Link>
                    </TD>
                    <TD className="max-w-48">
                      <span className="block truncate">
                        {customerDisplayName(quotation.customers, quotation.guest_name)}
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(quotation.quotation_date)}
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(quotation.valid_until)}
                    </TD>
                    <TD className="text-right font-medium tabular-nums">
                      {formatGHS(Number(quotation.total_amount || 0))}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(quotation.status, QUOTATION_STATUS_LABELS)} />
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