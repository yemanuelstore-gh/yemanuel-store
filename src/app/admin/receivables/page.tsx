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
import { listReceivables, PAGE_SIZE } from "@/lib/admin/treasury";
import { formatDate, formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Receivables — Yemanuel ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ReceivablesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.finance.read)) {
    return (
      <PageContainer>
        <PageHeader title="Receivables" breadcrumb={[{ label: "Finance" }, { label: "Receivables" }]} />
        <NoAccess module="receivables" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total, totalOutstanding } = await listReceivables(client, {
    page,
    pageSize: PAGE_SIZE,
    q,
  });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);

  return (
    <PageContainer>
      <PageHeader
        title="Receivables"
        description="Money owed to Yemanuel Store by customers on unpaid orders."
        breadcrumb={[{ label: "Finance" }, { label: "Receivables" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Outstanding" value={formatGHS(totalOutstanding)} icon="receivables" />
        <KpiCard label="Customers with balances" value={total.toLocaleString()} icon="customers" />
      </div>

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/receivables"
          q={q}
          searchPlaceholder="Search customer…"
          count={`${total.toLocaleString()} customer${total === 1 ? "" : "s"} with balances`}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="receivables"
            title="No receivables found"
            description={
              q
                ? "Try adjusting your search."
                : "All open customer balances are cleared. Well done!"
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Customer</TH>
                  <TH>Open Orders</TH>
                  <TH>Latest Activity</TH>
                  <TH className="text-right">Outstanding</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => (
                  <TR key={row.customer_name}>
                    <TD className="font-medium text-erp-text">{row.customer_name}</TD>
                    <TD className="tabular-nums text-erp-text-secondary">{row.order_count}</TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(row.latest_order_date)}
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