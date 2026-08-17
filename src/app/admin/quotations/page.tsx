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
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { quotationStatusTone } from "@/lib/admin/labels";
import {
  getQuotations,
  quotationStatusLabel,
  QUOTATION_STATUSES,
} from "@/lib/admin/quotations";

export const metadata: Metadata = {
  title: "Quotations — Yemanuel Store Admin",
};

type SearchParams = Promise<{
  q?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: string;
}>;

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat("en-GH", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00Z`),
  );

export default async function AdminQuotationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage message="Your account does not have the sales.read permission." />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await getQuotations({
    q: params.q,
    status: params.status,
    from: params.from,
    to: params.to,
    page,
  });

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.status) filterParams.set("status", params.status);
  if (params.from) filterParams.set("from", params.from);
  if (params.to) filterParams.set("to", params.to);

  const canCreate = hasPermission(session, PERMISSIONS.sales.create);
  const canUpdate = hasPermission(session, PERMISSIONS.sales.update);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quotations"
        description={`${result.total} quotation${result.total === 1 ? "" : "s"}.`}
        actions={
          canCreate && (
            <AdminButtonLink href="/admin/quotations/new">New Quotation</AdminButtonLink>
          )
        }
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search quotation number, customer or phone…"
            initialValue={params.q ?? ""}
            extraFields={
              <>
                <select
                  name="status"
                  defaultValue={params.status ?? ""}
                  aria-label="Filter by quotation status"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All statuses</option>
                  {QUOTATION_STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {quotationStatusLabel(value)}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  name="from"
                  defaultValue={params.from ?? ""}
                  aria-label="Quotation date from"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                />
                <input
                  type="date"
                  name="to"
                  defaultValue={params.to ?? ""}
                  aria-label="Quotation date to"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                />
              </>
            }
          />
        </div>

        {result.quotations.length === 0 ? (
          <AdminEmptyState
            title="No quotations found"
            message="Create a quotation to start the sales conversation, or adjust the filters."
            actionHref={canCreate ? "/admin/quotations/new" : undefined}
            actionLabel={canCreate ? "New Quotation" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Quotation</Th>
                <Th>Customer</Th>
                <Th>Date</Th>
                <Th>Valid until</Th>
                <Th className="text-right">Amount</Th>
                <Th>Status</Th>
                <Th>Created by</Th>
                <Th>Updated</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {result.quotations.map((quotation) => (
              <tr key={quotation.id}>
                <Td>
                  <Link
                    href={`/admin/quotations/${quotation.id}`}
                    className="font-semibold tabular-nums text-navy hover:underline"
                  >
                    {quotation.quotationNumber}
                  </Link>
                </Td>
                <Td>
                  <p className="text-ink">{quotation.customerName ?? "—"}</p>
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {formatDate(quotation.quotationDate)}
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {formatDate(quotation.validUntil)}
                </Td>
                <Td className="text-right font-semibold tabular-nums text-ink">
                  {formatGHS(quotation.totalAmount)}
                </Td>
                <Td>
                  <AdminBadge tone={quotationStatusTone(quotation.status)}>
                    {quotationStatusLabel(quotation.status)}
                  </AdminBadge>
                </Td>
                <Td className="text-ink-soft">{quotation.createdByName ?? "—"}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {formatDate(quotation.updatedAt.slice(0, 10))}
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/admin/quotations/${quotation.id}`}
                    className="inline-flex h-7 items-center rounded-md border border-line-strong bg-white px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
                  >
                    View
                  </Link>
                  {canUpdate && quotation.status !== "expired" && (
                    <Link
                      href={`/admin/quotations/${quotation.id}/edit`}
                      className="ml-1.5 inline-flex h-7 items-center rounded-md border border-line-strong bg-white px-2.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
                    >
                      Edit
                    </Link>
                  )}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/quotations"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}