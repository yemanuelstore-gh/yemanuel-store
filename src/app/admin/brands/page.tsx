import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { BrandForm } from "@/components/admin/catalogue-forms";
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
import { getBrands } from "@/lib/admin/catalogue-admin";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Brands — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function AdminBrandsPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return <UnauthorizedPage message="Your account does not have the products.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.products.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getBrands({ q: params.q, page });

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Brands"
        description={`${result.total} brand${result.total === 1 ? "" : "s"}.`}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <SearchForm placeholder="Search brands…" initialValue={params.q ?? ""} />
          {canCreate && (
            <AdminButtonLink href="/admin/brands/new">+ New brand</AdminButtonLink>
          )}
        </div>
        {result.brands.length === 0 ? (
          <AdminEmptyState
            title="No brands found"
            message="Try a different search, or create your first brand."
            actionHref={canCreate ? "/admin/brands/new" : undefined}
            actionLabel={canCreate ? "Create brand" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Name</Th>
                <Th>Slug</Th>
                <Th>Description</Th>
                <Th className="text-right">Products</Th>
                <Th>Status</Th>
              </>
            }
          >
            {result.brands.map((brand) => (
              <tr key={brand.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/brands/${brand.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {brand.name}
                  </Link>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">{brand.slug}</span>
                </Td>
                <Td className="max-w-64 truncate text-ink-soft">{brand.description ?? "—"}</Td>
                <Td className="text-right text-ink-soft">{brand.productsCount}</Td>
                <Td>
                  <AdminBadge tone={entityStatusTone(brand.status)}>
                    {statusLabel(brand.status)}
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
          basePath="/admin/brands"
          searchParams={filterParams}
        />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            New brand
          </h2>
          <BrandForm action="create" />
        </section>
      )}
    </div>
  );
}