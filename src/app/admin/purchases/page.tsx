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
import { listPurchaseOrders, PAGE_SIZE } from "@/lib/admin/purchasing";
import { PO_STATUS_LABELS, labelFor } from "@/lib/admin/labels";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Purchase Orders — Yemanuel ERP",
};

const PO_STATUSES = ["draft", "sent", "partially_received", "received", "cancelled", "closed"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function PurchaseOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return (
      <PageContainer>
        <PageHeader title="Purchase Orders" breadcrumb={[{ label: "Purchasing" }, { label: "Purchase Orders" }]} />
        <NoAccess module="purchase orders" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listPurchaseOrders(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Purchase Orders"
        description="Orders placed with suppliers for stock."
        breadcrumb={[{ label: "Purchasing" }, { label: "Purchase Orders" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/purchases"
          q={q}
          searchPlaceholder="Search PO number…"
          count={`${total.toLocaleString()} purchase order${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: PO_STATUSES.map((value) => ({ value, label: labelFor(value, PO_STATUS_LABELS) })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="purchase-orders"
            title="No purchase orders found"
            description={
              q || status ? "Try adjusting your search or filters." : "Purchase orders placed with suppliers will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>PO Number</TH>
                  <TH>Supplier</TH>
                  <TH>Expected</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((po) => (
                  <TR key={po.id}>
                    <TD className="font-medium text-erp-navy">{po.po_number}</TD>
                    <TD className="max-w-52">
                      <span className="block truncate text-erp-text-secondary">
                        {po.suppliers?.name ?? "—"}
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(po.expected_date)}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(po.status, PO_STATUS_LABELS)} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(po.created_at)}
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