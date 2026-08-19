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
import { Icon } from "@/components/ui/icons";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { listProducts, listCategories, listBrands, PAGE_SIZE, type CategoryListRow } from "@/lib/admin/inventory";
import { humanize } from "@/lib/admin/labels";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/cn";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products — Yemanuel Store ERP",
};

const PRODUCT_STATUSES = ["draft", "active", "inactive", "archived"];
const STOCK_STATUSES = ["in-stock", "low-stock", "out-of-stock"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function stockStatusLabel(status: string): string {
  switch (status) {
    case "in-stock":
      return "In Stock";
    case "low-stock":
      return "Low Stock";
    case "out-of-stock":
      return "Out of Stock";
    default:
      return "All Stock";
  }
}

function stockStatusTone(status: string): "success" | "warning" | "cancelled" | "neutral" {
  switch (status) {
    case "in-stock":
      return "success";
    case "low-stock":
      return "warning";
    case "out-of-stock":
      return "cancelled";
    default:
      return "neutral";
  }
}

function stockBadge(status: string) {
  const tone = stockStatusTone(status);
  const bg = {
    success: "bg-erp-success-soft text-erp-success",
    warning: "bg-erp-warning-soft text-erp-warning",
    cancelled: "bg-erp-cancelled-soft text-erp-cancelled",
    neutral: "bg-erp-canvas text-erp-text-secondary",
  }[tone];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium", bg)}>
      {status === "in-stock" && <span className="size-1.5 rounded-full bg-erp-success" />}
      {status === "low-stock" && <span className="size-1.5 rounded-full bg-erp-warning" />}
      {status === "out-of-stock" && <span className="size-1.5 rounded-full bg-erp-cancelled" />}
      {stockStatusLabel(status)}
    </span>
  );
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
  const categoryId = firstParam(params.category);
  const brandId = firstParam(params.brand);
  const stockStatus = firstParam(params.stock);
  const page = parsePage(firstParam(params.page));

  const client = await createClient();

  const [{ rows, total }, categoriesResult, brandsResult] = await Promise.all([
    listProducts(client, { page, pageSize: PAGE_SIZE, q, status, categoryId, brandId, stockStatus }),
    listCategories(client, { page: 1, pageSize: 500, status: "active" }),
    listBrands(client, { page: 1, pageSize: 500, status: "active" }),
  ]);

  const categories = categoriesResult.rows;
  const brands = brandsResult.rows;

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);
  if (categoryId) urlParams.set("category", categoryId);
  if (brandId) urlParams.set("brand", brandId);
  if (stockStatus) urlParams.set("stock", stockStatus);

  const hasActiveFilters = Boolean(q?.trim()) || Boolean(status) || Boolean(categoryId) || Boolean(brandId) || Boolean(stockStatus);

  const canManageCategories = hasPermission(session, PERMISSIONS.products.update);

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        description="Manage your product catalogue, categories, variants, pricing and stock."
        breadcrumb={[{ label: "Inventory" }, { label: "Products" }]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/products/import"
              className="inline-flex items-center gap-1.5 rounded-md border border-erp-border bg-white px-3 py-1.5 text-xs font-medium text-erp-text transition-colors hover:bg-erp-canvas hover:border-erp-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
            >
              <Icon name="download" size={14} />
              Import Products
            </Link>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-erp-gold px-3 py-1.5 text-xs font-medium text-erp-navy-deep transition-colors hover:bg-erp-gold-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-gold"
            >
              <Icon name="plus" size={14} />
              New Product
            </Link>
            {canManageCategories && (
              <Link
                href="/admin/products/categories"
                className="inline-flex items-center gap-1.5 rounded-md border border-erp-border bg-white px-3 py-1.5 text-xs font-medium text-erp-text transition-colors hover:bg-erp-canvas hover:border-erp-text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
              >
                <Icon name="filter" size={14} />
                Manage Categories
              </Link>
            )}
          </div>
        }
      />

      <div className="flex gap-4">
        <aside className="hidden lg:block w-64 shrink-0">
          <Card padding="sm" className="sticky top-20 h-fit">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-erp-text-secondary">Categories</h3>
            <nav className="space-y-1">
              <Link
                href="/admin/products"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  !categoryId
                    ? "bg-erp-navy/5 text-erp-navy font-medium"
                    : "text-erp-text-secondary hover:bg-erp-canvas hover:text-erp-text"
                )}
              >
                <span>All Products</span>
                <span className="ml-auto text-xs text-erp-text-muted">
                  {categories.reduce((sum, c) => sum + c.product_count, 0)}
                </span>
              </Link>
              {categories
                .filter((c) => c.parent_id === null)
                .map((cat) => (
                  <CategoryTreeLink
                    key={cat.id}
                    category={cat}
                    categories={categories}
                    currentCategoryId={categoryId}
                    level={0}
                  />
                ))}
            </nav>
          </Card>
        </aside>

        <main className="flex-1 min-w-0">
          <Card className="overflow-hidden">
            <ListToolbar
              baseHref="/admin/products"
              q={q}
              searchPlaceholder="Search product name, SKU or slug…"
              count={`${total.toLocaleString()} product${total === 1 ? "" : "s"}`}
              filters={[
                {
                  name: "category",
                  label: "Category",
                  value: categoryId,
                  options: [
                    { value: "", label: "All Categories" },
                    ...categories
                      .filter((c) => c.parent_id === null)
                      .map((c) => ({ value: c.id, label: c.name })),
                  ],
                },
                {
                  name: "brand",
                  label: "Brand",
                  value: brandId,
                  options: [
                    { value: "", label: "All Brands" },
                    ...brands.map((b) => ({ value: b.id, label: b.name })),
                  ],
                },
                {
                  name: "status",
                  label: "Status",
                  value: status,
                  options: PRODUCT_STATUSES.map((value) => ({ value, label: humanize(value) })),
                },
                {
                  name: "stock",
                  label: "Stock",
                  value: stockStatus,
                  options: [
                    { value: "", label: "All Stock" },
                    { value: "in-stock", label: "In Stock" },
                    { value: "low-stock", label: "Low Stock" },
                    { value: "out-of-stock", label: "Out of Stock" },
                  ],
                },
              ]}
              actions={
                hasActiveFilters && (
                  <Link
                    href="/admin/products"
                    className="h-8 rounded-md px-2 text-xs text-erp-text-secondary hover:text-erp-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                  >
                    Clear filters
                  </Link>
                )
              }
            />

            {rows.length === 0 ? (
              <EmptyState
                icon="products"
                title="No products found"
                description={
                  q || status || categoryId || brandId || stockStatus
                    ? "Try adjusting your search or filters."
                    : "Products in the catalog will appear here."
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <TR>
                        <TH className="w-48">Product</TH>
                        <TH className="w-32">SKU</TH>
                        <TH className="w-40">Category</TH>
                        <TH className="w-36">Brand</TH>
                        <TH className="w-24 text-center">Variants</TH>
                        <TH className="w-40 text-right">Price</TH>
                        <TH className="w-36 text-right">Stock</TH>
                        <TH className="w-32">Status</TH>
                        <TH className="w-48">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {rows.map((product) => (
                        <TR key={product.id}>
                          <TD className="max-w-48">
                            <Link
                              href={`/admin/products/${product.id}`}
                              className="flex items-center gap-2 group"
                            >
                              {product.primary_image_url && (
                                <img
                                  src={product.primary_image_url}
                                  alt=""
                                  className="size-10 shrink-0 rounded-md bg-erp-canvas object-cover group-hover:opacity-80 transition-opacity"
                                  loading="lazy"
                                />
                              )}
                              <div className="min-w-0">
                                <span className="block truncate font-medium text-erp-text group-hover:text-erp-navy transition-colors">
                                  {product.name}
                                </span>
                                <span className="block truncate text-[11px] text-erp-text-muted">
                                  /{product.slug}
                                </span>
                                {product.description && (
                                  <span className="block truncate text-[11px] text-erp-text-secondary max-w-48">
                                    {product.description}
                                  </span>
                                )}
                              </div>
                            </Link>
                          </TD>
                          <TD className="font-mono text-[12px] text-erp-navy">
                            {product.first_sku ?? "—"}
                          </TD>
                          <TD>
                            {product.category ? (
                              <Link
                                href={`/admin/products?category=${product.category.id}`}
                                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-erp-canvas text-erp-text-secondary hover:bg-erp-navy/10 hover:text-erp-navy transition-colors"
                              >
                                {product.category.name}
                              </Link>
                            ) : (
                              <span className="text-[11px] text-erp-text-muted">—</span>
                            )}
                          </TD>
                          <TD>
                            {product.brand ? (
                              <Link
                                href={`/admin/products?brand=${product.brand.id}`}
                                className="text-sm text-erp-text-secondary hover:text-erp-navy transition-colors"
                              >
                                {product.brand.name}
                              </Link>
                            ) : (
                              <span className="text-sm text-erp-text-muted">—</span>
                            )}
                          </TD>
                          <TD className="text-center tabular-nums text-erp-text-secondary">
                            {product.variant_count}
                          </TD>
                          <TD className="text-right tabular-nums text-erp-text">
                            {product.price_min != null && product.price_max != null
                              ? product.price_min === product.price_max
                                ? formatGHS(product.price_min)
                                : `${formatGHS(product.price_min)} – ${formatGHS(product.price_max)}`
                              : "—"}
                          </TD>
                          <TD className="text-right">
                            {product.total_stock === 0 ? (
                              stockBadge("out-of-stock")
                            ) : product.low_stock ? (
                              stockBadge("low-stock")
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-erp-success">
                                <span className="size-1.5 rounded-full bg-erp-success" />
                                {product.total_stock.toLocaleString()}
                              </span>
                            )}
                          </TD>
                          <TD>
                            <StatusBadge status={humanize(product.status)} />
                          </TD>
                          <TD className="whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/admin/products/${product.id}`}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-erp-text-secondary transition-colors hover:bg-erp-canvas hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                              >
                                <Icon name="eye" size={13} />
                                <span className="hidden sm:inline">View</span>
                              </Link>
                              {hasPermission(session, PERMISSIONS.products.update) && (
                                <Link
                                  href={`/admin/products/${product.id}/edit`}
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-erp-text-secondary transition-colors hover:bg-erp-canvas hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                                >
                                  <Icon name="more-horizontal" size={13} />
                                  <span className="hidden sm:inline">Edit</span>
                                </Link>
                              )}
                              <button
                                className="inline-flex items-center justify-center rounded-md p-1 text-erp-text-secondary transition-colors hover:bg-erp-canvas hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                                aria-label="More actions"
                              >
                                <Icon name="more-horizontal" size={13} />
                              </button>
                            </div>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
                <Pagination params={urlParams} page={page} total={total} />
              </>
            )}
          </Card>
        </main>
      </div>
    </PageContainer>
  );
}

function CategoryTreeLink({
  category,
  categories,
  currentCategoryId,
  level,
}: {
  category: CategoryListRow;
  categories: CategoryListRow[];
  currentCategoryId: string | undefined;
  level: number;
}) {
  const children = categories.filter((c) => c.parent_id === category.id);
  const isActive = currentCategoryId === category.id;
  const hasChildren = children.length > 0;

  return (
    <div className="pl-4 border-l border-erp-border/30 ml-2">
      <Link
        href={`/admin/products?category=${category.id}`}
        className={cn(
          "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
          isActive
            ? "bg-erp-navy/5 text-erp-navy font-medium"
            : "text-erp-text-secondary hover:bg-erp-canvas hover:text-erp-text"
        )}
      >
        <span className="truncate">{category.name}</span>
        <span className="ml-auto text-xs text-erp-text-muted">{category.product_count}</span>
      </Link>
      {hasChildren && (
        <div className="mt-0.5 space-y-1">
          {children.map((child) => (
            <CategoryTreeLink
              key={child.id}
              category={child}
              categories={categories}
              currentCategoryId={currentCategoryId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}