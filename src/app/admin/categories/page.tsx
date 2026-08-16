import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { CategoryForm } from "@/components/admin/catalogue-forms";
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
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getAllCategories, getCategories } from "@/lib/admin/catalogue-admin";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Categories — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function AdminCategoriesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return <UnauthorizedPage message="Your account does not have the products.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.products.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [result, allCategories] = await Promise.all([
    getCategories({ q: params.q, page }),
    getAllCategories(),
  ]);

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Categories"
        description={`${result.total} categor${result.total === 1 ? "y" : "ies"}.`}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <SearchForm placeholder="Search categories…" initialValue={params.q ?? ""} />
          {canCreate && (
            <AdminButtonLink href="/admin/categories/new">+ New category</AdminButtonLink>
          )}
        </div>
        {result.categories.length === 0 ? (
          <AdminEmptyState
            title="No categories found"
            message="Try a different search, or create your first category."
            actionHref={canCreate ? "/admin/categories/new" : undefined}
            actionLabel={canCreate ? "Create category" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Parent</Th>
                <Th className="text-right">Sort</Th>
                <Th className="text-right">Products</Th>
                <Th>Status</Th>
              </>
            }
          >
            {result.categories.map((category) => (
              <tr key={category.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/categories/${category.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {category.name}
                  </Link>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">{category.slug}</span>
                </Td>
                <Td className="text-ink-soft">{category.parent?.name ?? "—"}</Td>
                <Td className="text-right text-ink-soft">{category.sort_order}</Td>
                <Td className="text-right text-ink-soft">{category.productsCount}</Td>
                <Td>
                  <AdminBadge tone={entityStatusTone(category.status)}>
                    {statusLabel(category.status)}
                  </AdminBadge>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination
          page={page}
          pageSize={50}
          total={result.total}
          basePath="/admin/categories"
          searchParams={filterParams}
        />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            New category
          </h2>
          <CategoryForm action="create" categories={allCategories} />
        </section>
      )}
    </div>
  );
}