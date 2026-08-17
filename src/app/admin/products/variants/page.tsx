import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  AdminButtonLink,
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  SearchForm,
  Td,
  Th,
} from "@/components/admin/ui";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";
import { getProductsForSelect, getVariantList } from "@/lib/admin/variants";

export const metadata: Metadata = {
  title: "Product Variants — Yemanuel Store Admin",
};

type SearchParams = Promise<{
  q?: string;
  product?: string;
  status?: string;
  page?: string;
}>;

export default async function AdminVariantsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  const canCreate = hasPermission(session, PERMISSIONS.products.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const [result, products] = await Promise.all([
    getVariantList({
      q: params.q,
      productId: params.product,
      status: params.status,
      page,
      pageSize,
    }),
    getProductsForSelect(),
  ]);

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.product) filterParams.set("product", params.product);
  if (params.status) filterParams.set("status", params.status);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Product Variants"
        description={`${result.total} variant${result.total === 1 ? "" : "s"} across the catalogue.`}
        actions={
          canCreate ? (
            <AdminButtonLink href="/admin/products/variants/new">
              + New variant
            </AdminButtonLink>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search variants, SKU, barcode…"
            initialValue={params.q ?? ""}
            extraFields={
              <>
                <select
                  name="product"
                  defaultValue={params.product ?? ""}
                  aria-label="Filter by product"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All products</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={params.status ?? ""}
                  aria-label="Filter by status"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All statuses</option>
                  {["active", "inactive"].map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </>
            }
          />
        </div>

        {result.variants.length === 0 ? (
          <AdminEmptyState
            title="No variants found"
            message="Try adjusting your search or filters, or create a variant for a product."
            actionHref={canCreate ? "/admin/products/variants/new" : undefined}
            actionLabel={canCreate ? "New variant" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Product</Th>
                <Th>Variant</Th>
                <Th>SKU</Th>
                <Th>Barcode</Th>
                <Th className="text-right">Price</Th>
                <Th className="text-right">Stock</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {result.variants.map((variant) => (
              <tr key={variant.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/products/${variant.productId}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {variant.productName}
                  </Link>
                </Td>
                <Td>
                  <Link
                    href={`/admin/products/variants/${variant.id}`}
                    className="font-semibold text-ink hover:underline"
                  >
                    {variant.name}
                  </Link>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">{variant.sku}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">
                    {variant.barcode ?? "—"}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-right">
                  <span className="font-medium">
                    {variant.sellingPrice !== null ? formatGHS(variant.sellingPrice) : "—"}
                  </span>
                  {variant.salePrice !== null && (
                    <span className="ml-1 text-[11px] text-gold-dark">
                      sale {formatGHS(variant.salePrice)}
                    </span>
                  )}
                </Td>
                <Td
                  className={`whitespace-nowrap text-right ${
                    variant.stockTotal === 0 ? "text-ink-faint" : "text-ink-soft"
                  }`}
                >
                  {variant.stockTotal}
                </Td>
                <Td>
                  <AdminBadge tone={entityStatusTone(variant.status)}>
                    {statusLabel(variant.status)}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap text-right text-[11px] font-semibold">
                  <Link
                    href={`/admin/products/variants/${variant.id}`}
                    className="text-navy hover:underline"
                  >
                    View
                  </Link>
                  <span className="mx-1.5 text-ink-faint">·</span>
                  <Link
                    href={`/admin/products/variants/${variant.id}/edit`}
                    className="text-navy hover:underline"
                  >
                    Edit
                  </Link>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={result.total}
          basePath="/admin/products/variants"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}