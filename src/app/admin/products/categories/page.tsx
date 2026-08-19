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
import { listCategories, PAGE_SIZE } from "@/lib/admin/inventory";
import { humanize } from "@/lib/admin/labels";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories — Yemanuel Store ERP",
};

const CATEGORY_STATUSES = ["active", "inactive", "archived"];

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return (
      <PageContainer>
        <PageHeader title="Categories" breadcrumb={[{ label: "Inventory" }, { label: "Products" }, { label: "Categories" }]} />
        <NoAccess module="categories" />
      </PageContainer>
    );
  }

  const canManage = hasPermission(session, PERMISSIONS.products.update);

  const params = await searchParams;
  const q = firstParam(params.q);
  const status = firstParam(params.status);
  const parentId = firstParam(params.parent);
  const page = parsePage(firstParam(params.page));

  const client = await createClient();

  const [{ rows, total }, allCategoriesResult] = await Promise.all([
    listCategories(client, { page, pageSize: PAGE_SIZE, q, status, parentId: parentId ?? undefined }),
    listCategories(client, { page: 1, pageSize: 500, status: "active" }),
  ]);

  const allCategories = allCategoriesResult.rows;

  const urlParams = new URLSearchParams();
  if (q) urlParams.set("q", q);
  if (status) urlParams.set("status", status);
  if (parentId) urlParams.set("parent", parentId);

  const hasActiveFilters = Boolean(q?.trim()) || Boolean(status) || Boolean(parentId);

  const topLevelCategories = allCategories.filter((c) => c.parent_id === null);

  return (
    <PageContainer>
      <PageHeader
        title="Categories"
        description="Organize your product catalogue with categories and subcategories."
        breadcrumb={[{ label: "Inventory" }, { label: "Products" }, { label: "Categories" }]}
        actions={
          canManage && (
            <Link
              href="/admin/products/categories/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-erp-gold px-3 py-1.5 text-xs font-medium text-erp-navy-deep transition-colors hover:bg-erp-gold-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-gold"
            >
              <Icon name="plus" size={14} />
              Add Category
            </Link>
          )
        }
      />

      <div className="flex gap-4">
        <aside className="hidden lg:block w-64 shrink-0">
          <Card padding="sm" className="sticky top-20 h-fit">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-erp-text-secondary">Category Tree</h3>
            <nav className="space-y-1">
              <Link
                href="/admin/products/categories"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-sm transition-colors",
                  !parentId
                    ? "bg-erp-navy/5 text-erp-navy font-medium"
                    : "text-erp-text-secondary hover:bg-erp-canvas hover:text-erp-text"
                )}
              >
                <span>All Categories</span>
                <span className="ml-auto text-xs text-erp-text-muted">
                  {allCategories.reduce((sum, c) => sum + c.product_count, 0)}
                </span>
              </Link>
              {topLevelCategories.map((cat) => (
                <CategoryTreeLink
                  key={cat.id}
                  category={cat}
                  categories={allCategories}
                  currentParentId={parentId}
                  level={0}
                />
              ))}
            </nav>
          </Card>
        </aside>

        <main className="flex-1 min-w-0">
          <Card className="overflow-hidden">
            <ListToolbar
              baseHref="/admin/products/categories"
              q={q}
              searchPlaceholder="Search category name or slug…"
              count={`${total.toLocaleString()} categor${total === 1 ? "y" : "ies"}`}
              filters={[
                {
                  name: "status",
                  label: "Status",
                  value: status,
                  options: CATEGORY_STATUSES.map((value) => ({ value, label: humanize(value) })),
                },
                {
                  name: "parent",
                  label: "Parent",
                  value: parentId,
                  options: [
                    { value: "", label: "Top Level Only" },
                    { value: "all", label: "All Levels" },
                    ...topLevelCategories.map((c) => ({ value: c.id, label: c.name })),
                  ],
                },
              ]}
              actions={
                hasActiveFilters && (
                  <Link
                    href="/admin/products/categories"
                    className="h-8 rounded-md px-2 text-xs text-erp-text-secondary hover:text-erp-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                  >
                    Clear filters
                  </Link>
                )
              }
            />

            {rows.length === 0 ? (
              <EmptyState
                icon="filter"
                title="No categories found"
                description={
                  q || status || parentId
                    ? "Try adjusting your search or filters."
                    : "Categories will appear here. Create your first category to get started."
                }
                action={
                  canManage && (
                    <Link
                      href="/admin/products/categories/new"
                      className="inline-flex items-center gap-1.5 rounded-md bg-erp-gold px-3 py-1.5 text-xs font-medium text-erp-navy-deep transition-colors hover:bg-erp-gold-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-gold"
                    >
                      Add Category
                    </Link>
                  )
                }
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <THead>
                      <TR>
                        <TH className="w-48">Category</TH>
                        <TH className="w-24">Code</TH>
                        <TH className="w-40">Parent</TH>
                        <TH className="w-20 text-center">Products</TH>
                        <TH className="w-28">Status</TH>
                        <TH className="w-36">Created</TH>
                        <TH className="w-48">Actions</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {rows.map((category) => (
                        <TR key={category.id}>
                          <TD className="max-w-48">
                            <Link
                              href={`/admin/products/categories/${category.id}`}
                              className="font-medium text-erp-text hover:text-erp-navy transition-colors"
                            >
                              {category.name}
                            </Link>
                            {category.description && (
                              <span className="block truncate text-[11px] text-erp-text-muted max-w-48">
                                {category.description}
                              </span>
                            )}
                          </TD>
                          <TD className="font-mono text-[12px] text-erp-text-secondary">
                            {category.slug}
                          </TD>
                          <TD>
                            {category.parent ? (
                              <Link
                                href={`/admin/products/categories?parent=${category.parent.id}`}
                                className="text-sm text-erp-text-secondary hover:text-erp-navy transition-colors"
                              >
                                {category.parent.name}
                              </Link>
                            ) : (
                              <span className="text-sm text-erp-text-muted">—</span>
                            )}
                          </TD>
                          <TD className="text-center tabular-nums text-erp-text-secondary">
                            {category.product_count}
                          </TD>
                          <TD>
                            <StatusBadge status={humanize(category.status)} />
                          </TD>
                          <TD className="whitespace-nowrap text-erp-text-secondary">
                            {formatDate(category.created_at)}
                          </TD>
                          <TD className="whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/admin/products/categories/${category.id}`}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-erp-text-secondary transition-colors hover:bg-erp-canvas hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                              >
                                <Icon name="eye" size={13} />
                                <span className="hidden sm:inline">View</span>
                              </Link>
                              {canManage && (
                                <>
                                  <Link
                                    href={`/admin/products/categories/${category.id}/edit`}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-erp-text-secondary transition-colors hover:bg-erp-canvas hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                                  >
                                    <Icon name="more-horizontal" size={13} />
                                    <span className="hidden sm:inline">Edit</span>
                                  </Link>
                                  <button
                                    className={cn(
                                      "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy",
                                      category.status === "active"
                                        ? "text-erp-text-secondary hover:bg-erp-canvas hover:text-erp-warning"
                                        : "text-erp-text-secondary hover:bg-erp-canvas hover:text-erp-success"
                                    )}
                                  >
                                    {category.status === "active" ? (
                                      <>
                                        <Icon name="alert" size={13} />
                                        <span className="hidden sm:inline">Deactivate</span>
                                      </>
                                    ) : (
                                      <>
                                        <Icon name="check" size={13} />
                                        <span className="hidden sm:inline">Activate</span>
                                      </>
                                    )}
                                  </button>
                                </>
                              )}
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
  currentParentId,
  level,
}: {
  category: { id: string; name: string; slug: string; product_count: number; parent_id: string | null };
  categories: { id: string; name: string; slug: string; product_count: number; parent_id: string | null }[];
  currentParentId: string | undefined;
  level: number;
}) {
  const children = categories.filter((c) => c.parent_id === category.id);
  const isActive = currentParentId === category.id;
  const hasChildren = children.length > 0;

  return (
    <div className="pl-4 border-l border-erp-border/30 ml-2">
      <Link
        href={`/admin/products/categories?parent=${category.id}`}
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
              currentParentId={currentParentId}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}