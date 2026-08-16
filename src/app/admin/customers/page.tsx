import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
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
import { getCustomers } from "@/lib/admin/customers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGhanaPhone } from "@/lib/format";
import { customerStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Customers — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; type?: string; status?: string; page?: string }>;

export default async function AdminCustomersPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.customers.read)) {
    return <UnauthorizedPage message="Your account does not have the customers.read permission." />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getCustomers({
    q: params.q,
    customerType: params.type,
    status: params.status,
    page,
  });

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.type) filterParams.set("type", params.type);
  if (params.status) filterParams.set("status", params.status);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Customers"
        description={`${result.total} customer${result.total === 1 ? "" : "s"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search name, code, phone or business…"
            initialValue={params.q ?? ""}
            extraFields={
              <>
                <select
                  name="type"
                  defaultValue={params.type ?? ""}
                  aria-label="Filter by type"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All types</option>
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
                <select
                  name="status"
                  defaultValue={params.status ?? ""}
                  aria-label="Filter by status"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="blocked">Blocked</option>
                </select>
              </>
            }
          />
        </div>

        {result.customers.length === 0 ? (
          <AdminEmptyState
            title="No customers found"
            message="Try adjusting the search or filters. Customers register through the storefront or are created by staff."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Code</Th>
                <Th>Name</Th>
                <Th>Business</Th>
                <Th>Phone</Th>
                <Th>Email</Th>
                <Th>Type</Th>
                <Th className="text-right">Orders</Th>
                <Th>Status</Th>
                <Th>Created</Th>
              </>
            }
          >
            {result.customers.map((customer) => (
              <tr key={customer.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <span className="font-mono text-xs text-ink-soft">
                    {customer.customerCode}
                  </span>
                </Td>
                <Td>
                  <Link
                    href={`/admin/customers/${customer.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {customer.firstName} {customer.lastName}
                  </Link>
                </Td>
                <Td className="text-ink-soft">{customer.businessName ?? "—"}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {formatGhanaPhone(customer.phone)}
                </Td>
                <Td className="text-ink-soft">{customer.email ?? "—"}</Td>
                <Td className="capitalize text-ink-soft">
                  {statusLabel(customer.customerType)}
                </Td>
                <Td className="text-right text-ink-soft">{customer.orderCount}</Td>
                <Td>
                  <AdminBadge tone={customerStatusTone(customer.status)}>
                    {statusLabel(customer.status)}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(customer.createdAt).toLocaleDateString("en-GB")}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/customers"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}