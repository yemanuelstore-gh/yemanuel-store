import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { ListToolbar } from "@/components/admin/list-toolbar";
import { Pagination } from "@/components/admin/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { NoAccess } from "@/components/admin/no-access";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { listStock, PAGE_SIZE } from "@/lib/admin/inventory";
import { formatGHS, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stock — Yemanuel ERP",
};

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return (
      <PageContainer>
        <PageHeader title="Stock" breadcrumb={[{ label: "Inventory" }, { label: "Stock" }]} />
        <NoAccess module="stock" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listStock(client, { page, pageSize: PAGE_SIZE, q });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);

  return (
    <PageContainer>
      <PageHeader
        title="Stock"
        description="On-hand quantities and values across all locations."
        breadcrumb={[{ label: "Inventory" }, { label: "Stock" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/stock"
          q={q}
          searchPlaceholder="Search SKU or product name…"
          count={`${total.toLocaleString()} stock line${total === 1 ? "" : "s"}`}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="stock"
            title="No stock lines found"
            description={
              q ? "Try adjusting your search." : "Inventory records for each SKU and location will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH>SKU</TH>
                  <TH className="text-right">On hand</TH>
                  <TH className="text-right">Reserved</TH>
                  <TH className="text-right">Available</TH>
                  <TH className="text-right">Avg cost</TH>
                  <TH className="text-right">Stock value</TH>
                  <TH>Updated</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((row) => {
                  const onHand = Number(row.quantity_on_hand || 0);
                  const reserved = Number(row.reserved_quantity || 0);
                  const available = onHand - reserved;
                  const low = row.reorder_level != null && onHand <= Number(row.reorder_level);
                  return (
                    <TR key={row.id}>
                      <TD className="max-w-60">
                        <span className="block truncate font-medium text-erp-text">
                          {row.product_variants?.products?.name ?? "—"}
                        </span>
                        {row.product_variants?.name && (
                          <span className="block truncate text-[11px] text-erp-text-muted">
                            {row.product_variants.name}
                          </span>
                        )}
                      </TD>
                      <TD className="font-mono text-[12px] text-erp-text-secondary">
                        {row.product_variants?.sku ?? "—"}
                      </TD>
                      <TD className={`text-right tabular-nums ${low ? "font-semibold text-erp-cancelled" : "text-erp-text"}`}>
                        {onHand.toLocaleString()}
                        {low && <span className="ml-1 text-[10px]">low</span>}
                      </TD>
                      <TD className="text-right tabular-nums text-erp-text-secondary">
                        {reserved.toLocaleString()}
                      </TD>
                      <TD className="text-right tabular-nums text-erp-text-secondary">
                        {available.toLocaleString()}
                      </TD>
                      <TD className="text-right tabular-nums text-erp-text-secondary">
                        {formatGHS(Number(row.average_cost || 0))}
                      </TD>
                      <TD className="text-right font-medium tabular-nums text-erp-text">
                        {formatGHS(onHand * Number(row.average_cost || 0))}
                      </TD>
                      <TD className="whitespace-nowrap text-erp-text-secondary">
                        {formatDateTime(row.updated_at)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
            <Pagination params={urlParams} page={page} total={total} />
          </>
        )}
      </Card>
    </PageContainer>
  );
}