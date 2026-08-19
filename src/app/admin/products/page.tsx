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
import { listProducts, PAGE_SIZE } from "@/lib/admin/inventory";
import { humanize } from "@/lib/admin/labels";
import { formatGHS, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products — Yemanuel ERP",
};

const PRODUCT_STATUSES = ["draft", "active", "inactive", "archived"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return (
      <PageContainer>
        <PageHeader title="Products" breadcrumb={[{ label: "Inventory" }, { label: "Products" }]} />
        <NoAccess module="products" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listProducts(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        description="The catalog of items Yemanuel Store sells."
        breadcrumb={[{ label: "Inventory" }, { label: "Products" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/products"
          q={q}
          searchPlaceholder="Search product name or slug…"
          count={`${total.toLocaleString()} product${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: PRODUCT_STATUSES.map((value) => ({ value, label: humanize(value) })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="products"
            title="No products found"
            description={
              q || status ? "Try adjusting your search or filters." : "Products in the catalog will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>Product</TH>
                  <TH className="text-right">Variants</TH>
                  <TH>SKU</TH>
                  <TH className="text-right">Price</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((product) => (
                  <TR key={product.id}>
                    <TD className="max-w-64">
                      <span className="block truncate font-medium text-erp-text">
                        {product.name}
                      </span>
                      <span className="block truncate text-[11px] text-erp-text-muted">
                        /{product.slug}
                      </span>
                    </TD>
                    <TD className="text-right tabular-nums text-erp-text-secondary">
                      {product.variant_count}
                    </TD>
                    <TD className="text-erp-text-secondary">{product.first_sku ?? "—"}</TD>
                    <TD className="text-right tabular-nums text-erp-text">
                      {product.price_min != null && product.price_max != null
                        ? product.price_min === product.price_max
                          ? formatGHS(product.price_min)
                          : `${formatGHS(product.price_min)} – ${formatGHS(product.price_max)}`
                        : "—"}
                    </TD>
                    <TD>
                      <StatusBadge status={humanize(product.status)} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(product.created_at)}
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