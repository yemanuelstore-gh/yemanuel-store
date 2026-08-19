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
import { listAdjustments, PAGE_SIZE } from "@/lib/admin/inventory";
import { humanize } from "@/lib/admin/labels";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Adjustments — Yemanuel Store ERP",
};

const ADJUSTMENT_STATUSES = ["draft", "approved", "posted", "cancelled"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function AdjustmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return (
      <PageContainer>
        <PageHeader
          title="Adjustments"
          breadcrumb={[{ label: "Inventory" }, { label: "Adjustments" }]}
        />
        <NoAccess module="stock adjustments" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listAdjustments(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Adjustments"
        description="Count corrections and stock level changes."
        breadcrumb={[{ label: "Inventory" }, { label: "Adjustments" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/inventory/adjustments"
          q={q}
          searchPlaceholder="Search adjustment number…"
          count={`${total.toLocaleString()} adjustment${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: ADJUSTMENT_STATUSES.map((value) => ({ value, label: humanize(value) })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="adjustments"
            title="No adjustments found"
            description={
              q || status
                ? "Try adjusting your search or filters."
                : "Stock adjustments and count corrections will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Adjustment</TH>
                  <TH>Reason</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((adjustment) => (
                  <TR key={adjustment.id}>
                    <TD className="font-medium text-erp-navy">{adjustment.adjustment_number}</TD>
                    <TD className="max-w-64">
                      <span className="block truncate text-erp-text-secondary">
                        {adjustment.reason ?? "—"}
                      </span>
                    </TD>
                    <TD>
                      <StatusBadge status={humanize(adjustment.status ?? "")} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDateTime(adjustment.created_at)}
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