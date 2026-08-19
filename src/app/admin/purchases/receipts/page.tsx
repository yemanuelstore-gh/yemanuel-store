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
import { listGoodsReceipts, PAGE_SIZE } from "@/lib/admin/purchasing";
import { GOODS_RECEIPT_STATUS_LABELS, labelFor } from "@/lib/admin/labels";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Goods Receipts — Yemanuel ERP",
};

const RECEIPT_STATUSES = ["draft", "received", "completed", "cancelled"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function GoodsReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.purchases.read)) {
    return (
      <PageContainer>
        <PageHeader
          title="Goods Receipts"
          breadcrumb={[{ label: "Purchasing" }, { label: "Goods Receipts" }]}
        />
        <NoAccess module="goods receipts" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listGoodsReceipts(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Goods Receipts"
        description="Stock received against purchase orders."
        breadcrumb={[{ label: "Purchasing" }, { label: "Goods Receipts" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/purchases/receipts"
          q={q}
          searchPlaceholder="Search receipt number…"
          count={`${total.toLocaleString()} receipt${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: RECEIPT_STATUSES.map((value) => ({
                value,
                label: labelFor(value, GOODS_RECEIPT_STATUS_LABELS),
              })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="goods-receipts"
            title="No goods receipts found"
            description={
              q || status
                ? "Try adjusting your search or filters."
                : "Goods received against purchase orders will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Receipt</TH>
                  <TH>Purchase Order</TH>
                  <TH>Location</TH>
                  <TH>Received</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((receipt) => (
                  <TR key={receipt.id}>
                    <TD className="font-medium text-erp-navy">{receipt.receipt_number}</TD>
                    <TD>
                      {receipt.purchase_orders?.po_number ? (
                        <Link
                          href={`/admin/purchases`}
                          className="text-erp-navy hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                        >
                          {receipt.purchase_orders.po_number}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TD>
                    <TD className="max-w-52">
                      <span className="block truncate text-erp-text-secondary">
                        {receipt.locations?.name ?? "—"}
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(receipt.received_date)}
                    </TD>
                    <TD>
                      <StatusBadge status={labelFor(receipt.status, GOODS_RECEIPT_STATUS_LABELS)} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(receipt.created_at)}
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