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
import { listTransfers, PAGE_SIZE } from "@/lib/admin/inventory";
import { humanize } from "@/lib/admin/labels";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Transfers — Yemanuel ERP",
};

const TRANSFER_STATUSES = ["draft", "in_transit", "received", "cancelled"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return (
      <PageContainer>
        <PageHeader
          title="Transfers"
          breadcrumb={[{ label: "Inventory" }, { label: "Transfers" }]}
        />
        <NoAccess module="transfers" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listTransfers(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Transfers"
        description="Stock moved between locations."
        breadcrumb={[{ label: "Inventory" }, { label: "Transfers" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/inventory/transfers"
          q={q}
          searchPlaceholder="Search transfer number…"
          count={`${total.toLocaleString()} transfer${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: TRANSFER_STATUSES.map((value) => ({ value, label: humanize(value) })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="transfers"
            title="No transfers found"
            description={
              q || status
                ? "Try adjusting your search or filters."
                : "Stock transfers between locations will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Transfer</TH>
                  <TH>From</TH>
                  <TH>To</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((transfer) => (
                  <TR key={transfer.id}>
                    <TD className="font-medium text-erp-navy">{transfer.transfer_number}</TD>
                    <TD className="text-erp-text-secondary">
                      {transfer.stock_transfers_from_location_id_fkey?.name ?? "—"}
                    </TD>
                    <TD className="text-erp-text-secondary">
                      {transfer.stock_transfers_to_location_id_fkey?.name ?? "—"}
                    </TD>
                    <TD>
                      <StatusBadge status={humanize(transfer.status ?? "")} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDateTime(transfer.created_at)}
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