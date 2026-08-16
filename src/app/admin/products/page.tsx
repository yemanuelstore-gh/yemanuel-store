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
import { productStatusTone, statusLabel } from "@/lib/admin/labels";
import { getBrandsForSelect, getCategoriesForSelect, getProducts } from "@/lib/admin/products";

export const metadata: Metadata = {
  title: "Products — Yemanuel Store Admin",
};

type SearchParams = Promise<{
  q?: string;
  category?: string;
  brand?: string;
  status?: string;
  page?: string;
}>;

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  const canCreate = hasPermission(session, PERMISSIONS.products.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const [result, categories, brands] = await Promise.all([
    getProducts({
      q: params.q,
      categoryId: params.category,
      brandId: params.brand,
      status: params.status,
      page,
      pageSize,
    }),
    getCategoriesForSelect(),
    getBrandsForSelect(),
  ]);

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.category) filterParams.set("category", params.category);
  if (params.brand) filterParams.set("brand", params.brand);
  if (params.status) filterParams.set("status", params.status);

  const categoryId = params.category ?? "";
  const brandId = params.brand ?? "";
  const status = params.status ?? "";

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description={`${result.total} product${result.total === 1 ? "" : "s"} in the catalogue.`}
        actions={
          canCreate ? (
            <AdminButtonLink href="/admin/products/new">+ New product</AdminButtonLink>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search products…"
            initialValue={params.q ?? ""}
            extraFields={
              <>
                <select
                  name="category"
                  defaultValue={categoryId}
                  aria-label="Filter by category"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <select
                  name="brand"
                  defaultValue={brandId}
                  aria-label="Filter by brand"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All brands</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={status}
                  aria-label="Filter by status"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All statuses</option>
                  {["draft", "active", "inactive", "archived"].map((value) => (
                    <option key={value} value={value}>
                      {value.charAt(0).toUpperCase() + value.slice(1)}
                    </option>
                  ))}
                </select>
              </>
            }
          />
        </div>

        {result.products.length === 0 ? (
          <AdminEmptyState
            title="No products found"
            message="Try adjusting your search or filters, or create your first product."
            actionHref={canCreate ? "/admin/products/new" : undefined}
            actionLabel={canCreate ? "Create product" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Product</Th>
                <Th>Category</Th>
                <Th>Brand</Th>
                <Th>SKU</Th>
                <Th className="text-right">Selling price</Th>
                <Th>Status</Th>
                <Th className="text-right">Variants</Th>
              </>
            }
          >
            {result.products.map((product) => (
              <tr key={product.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {product.name}
                  </Link>
                </Td>
                <Td className="text-ink-soft">{product.categoryName ?? "—"}</Td>
                <Td className="text-ink-soft">{product.brandName ?? "—"}</Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">
                    {product.primarySku ?? "—"}
                  </span>
                </Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {product.sellingPrice !== null ? formatGHS(product.sellingPrice) : "—"}
                </Td>
                <Td>
                  <AdminBadge tone={productStatusTone(product.status)}>
                    {statusLabel(product.status)}
                  </AdminBadge>
                </Td>
                <Td className="text-right text-ink-soft">{product.variantsCount}</Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={result.total}
          basePath="/admin/products"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}