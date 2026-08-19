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
import { listVariants, PAGE_SIZE } from "@/lib/admin/inventory";
import { humanize } from "@/lib/admin/labels";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Variants — Yemanuel ERP",
};

const VARIANT_STATUSES = ["active", "inactive", "archived"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function VariantsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return (
      <PageContainer>
        <PageHeader title="Variants" breadcrumb={[{ label: "Inventory" }, { label: "Variants" }]} />
        <NoAccess module="product variants" />
      </PageContainer>
    );
  }

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const page = parsePage(firstParam(params.page));
  const client = await createClient();

  const { rows, total } = await listVariants(client, { page, pageSize: PAGE_SIZE, q, status });

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);

  return (
    <PageContainer>
      <PageHeader
        title="Variants"
        description="SKUs and options under each catalog product."
        breadcrumb={[{ label: "Inventory" }, { label: "Variants" }]}
      />

      <Card className="overflow-hidden">
        <ListToolbar
          baseHref="/admin/variants"
          q={q}
          searchPlaceholder="Search SKU or variant name…"
          count={`${total.toLocaleString()} variant${total === 1 ? "" : "s"}`}
          filters={[
            {
              name: "status",
              label: "status",
              value: status,
              options: VARIANT_STATUSES.map((value) => ({ value, label: humanize(value) })),
            },
          ]}
        />

        {rows.length === 0 ? (
          <EmptyState
            icon="variants"
            title="No variants found"
            description={
              q || status ? "Try adjusting your search or filters." : "Variants in the catalog will appear here."
            }
          />
        ) : (
          <>
            <Table>
              <THead>
                <TR>
                  <TH>SKU</TH>
                  <TH>Variant</TH>
                  <TH>Product</TH>
                  <TH>Status</TH>
                  <TH>Created</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((variant) => (
                  <TR key={variant.id}>
                    <TD className="font-mono text-[12px] text-erp-navy">{variant.sku ?? "—"}</TD>
                    <TD className="font-medium text-erp-text">{variant.name || "—"}</TD>
                    <TD className="max-w-64">
                      <span className="block truncate text-erp-text-secondary">
                        {variant.products?.name ?? "—"}
                      </span>
                    </TD>
                    <TD>
                      <StatusBadge status={humanize(variant.status)} />
                    </TD>
                    <TD className="whitespace-nowrap text-erp-text-secondary">
                      {formatDate(variant.created_at)}
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