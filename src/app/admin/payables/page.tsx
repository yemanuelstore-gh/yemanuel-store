import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { KpiCard } from "@/components/admin/kpi-card";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { listPayables, PAGE_SIZE } from "@/lib/admin/treasury";
import { formatDate, formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payables — Yemanuel Store ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function PayablesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.finance.read)) {
    return (
      <PageContainer>
        <PageHeader title="Payables" breadcrumb={[{ label: "Finance" }, { label: "Payables" }]} />
        <NoAccess module="payables" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total, totalOutstanding } = await listPayables(client, {
    page,
    pageSize: PAGE_SIZE,
    q,
  });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);

  return (
    <PageContainer>
      <PageHeader
        title="Payables"
        description="Money Yemanuel Store owes suppliers on open invoices."
        breadcrumb={[{ label: "Finance" }, { label: "Payables" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Outstanding" value={formatGHS(totalOutstanding)} icon="payables" />
        <KpiCard label="Suppliers with balances" value={total.toLocaleString()} icon="suppliers" />
      </div>

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/payables"
          q={q}
          searchPlaceholder="Search supplier…"
          count={`${total.toLocaleString()} supplier${total === 1 ? "" : "s"} with balances`}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="payables"
            title="No payables found"
            description={
              q ? "Try adjusting your search." : "All supplier invoices are settled. Well done!"
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Supplier</TH>
                  <TH>Open Invoices</TH>
                  <TH>Earliest Due</TH>
                  <TH className="text-right">Outstanding</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.supplier_name}>
                    <TD className="font-medium text-erp-text">{row.supplier_name}</TD>
                    <TD className="tabular-nums text-erp-text-secondary">{row.invoice_count}</TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(row.oldest_due_date)}
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {formatGHS(row.outstanding)}
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