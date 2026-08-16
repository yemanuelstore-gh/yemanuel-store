import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { SupplierForm } from "@/components/admin/supplier-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  SearchForm,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getSuppliers } from "@/lib/admin/suppliers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGhanaPhone } from "@/lib/format";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Suppliers — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function AdminSuppliersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.suppliers.read)) {
    return <UnauthorizedPage message="Your account does not have the suppliers.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.suppliers.create);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getSuppliers({ q: params.q, page });

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Suppliers"
        description={`${result.total} supplier${result.total === 1 ? "" : "s"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm placeholder="Search suppliers…" initialValue={params.q ?? ""} />
        </div>
        {result.suppliers.length === 0 ? (
          <AdminEmptyState
            title="No suppliers found"
            message="Try a different search, or add your first supplier."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Contact person</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th className="text-right">Terms (days)</Th>
                <Th>Status</Th>
              </>
            }
          >
            {result.suppliers.map((supplier) => (
              <tr key={supplier.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <span className="font-mono text-xs text-ink-soft">
                    {supplier.supplierCode}
                  </span>
                </Td>
                <Td>
                  <Link
                    href={`/admin/suppliers/${supplier.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {supplier.name}
                  </Link>
                </Td>
                <Td className="text-ink-soft">{supplier.contactPerson ?? "—"}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {formatGhanaPhone(supplier.phone)}
                </Td>
                <Td className="text-ink-soft">{supplier.email ?? "—"}</Td>
                <Td className="text-right text-ink-soft">{supplier.paymentTermsDays ?? "—"}</Td>
                <Td>
                  <AdminBadge tone={entityStatusTone(supplier.status)}>
                    {statusLabel(supplier.status)}
                  </AdminBadge>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/suppliers"
          searchParams={filterParams}
        />
      </div>

      {canCreate && (
        <section className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            New supplier
          </h2>
          <SupplierForm action="create" />
        </section>
      )}
    </div>
  );
}