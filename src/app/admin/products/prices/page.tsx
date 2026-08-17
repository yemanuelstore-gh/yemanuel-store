import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { DeletePriceForm } from "@/components/admin/product-forms";
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
import {
  pricePeriodTone,
  priceTypeTone,
  statusLabel,
} from "@/lib/admin/labels";
import { getPriceList, getPriceLocations } from "@/lib/admin/variants";

export const metadata: Metadata = {
  title: "Price Lists — Yemanuel Store Admin",
};

type SearchParams = Promise<{
  q?: string;
  type?: string;
  location?: string;
  period?: string;
  page?: string;
}>;

export default async function AdminPricesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  const canCreate = hasPermission(session, PERMISSIONS.products.create);
  const canUpdate = hasPermission(session, PERMISSIONS.products.update);
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return <UnauthorizedPage message="Your account does not have the products.read permission." />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const [result, locations] = await Promise.all([
    getPriceList({
      q: params.q,
      priceType: params.type,
      locationId: params.location,
      period: params.period,
      page,
      pageSize,
    }),
    getPriceLocations(),
  ]);

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.type) filterParams.set("type", params.type);
  if (params.location) filterParams.set("location", params.location);
  if (params.period) filterParams.set("period", params.period);

  const summary = [
    { label: "Active", count: result.counts.active, tone: "success" as const },
    { label: "Future", count: result.counts.future, tone: "info" as const },
    { label: "Expired", count: result.counts.expired, tone: "muted" as const },
    { label: "Matching", count: result.total, tone: "neutral" as const },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Price Lists"
        description={`${result.total} price record${result.total === 1 ? "" : "s"} on selling and sale price lists.`}
        actions={
          canCreate ? (
            <AdminButtonLink href="/admin/products/prices/new">+ New price</AdminButtonLink>
          ) : undefined
        }
      />

      <div className="grid gap-3 sm:grid-cols-4">
        {summary.map((item) => (
          <div key={item.label} className="rounded-lg border border-line bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
              {item.label}
            </p>
            <p
              className={`mt-1 text-2xl font-semibold ${
                item.tone === "success"
                  ? "text-navy"
                  : item.tone === "info"
                    ? "text-navy-dark"
                    : item.tone === "muted"
                      ? "text-ink-faint"
                      : "text-ink"
              }`}
            >
              {item.count}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search product, variant, SKU…"
            initialValue={params.q ?? ""}
            extraFields={
              <>
                <select
                  name="type"
                  defaultValue={params.type ?? ""}
                  aria-label="Filter by price type"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All price types</option>
                  <option value="selling">Selling</option>
                  <option value="sale">Sale</option>
                </select>
                <select
                  name="location"
                  defaultValue={params.location ?? ""}
                  aria-label="Filter by location"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All locations</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <select
                  name="period"
                  defaultValue={params.period ?? ""}
                  aria-label="Filter by validity period"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  <option value="">All periods</option>
                  <option value="active">Active</option>
                  <option value="future">Future</option>
                  <option value="expired">Expired</option>
                </select>
              </>
            }
          />
        </div>

        {result.prices.length === 0 ? (
          <AdminEmptyState
            title="No prices found"
            message="Try adjusting your search or filters, or create a new price."
            actionHref={canCreate ? "/admin/products/prices/new" : undefined}
            actionLabel={canCreate ? "New price" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Product</Th>
                <Th>Variant</Th>
                <Th>SKU</Th>
                <Th>Type</Th>
                <Th className="text-right">Price</Th>
                <Th>Location</Th>
                <Th>Valid from</Th>
                <Th>Valid to</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {result.prices.map((price) => (
              <tr key={price.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/products/${price.productId}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {price.productName}
                  </Link>
                </Td>
                <Td>
                  {price.variantId ? (
                    <Link
                      href={`/admin/products/variants/${price.variantId}`}
                      className="text-ink hover:underline"
                    >
                      {price.variantName ?? "—"}
                    </Link>
                  ) : (
                    <span className="text-ink-faint">All variants</span>
                  )}
                </Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">
                    {price.sku ?? "—"}
                  </span>
                </Td>
                <Td>
                  <AdminBadge tone={priceTypeTone(price.priceType)}>
                    {statusLabel(price.priceType)}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(price.amount)}
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {price.locationName ?? "All locations"}
                </Td>
                <Td className="whitespace-nowrap text-xs text-ink-soft">
                  {new Date(price.validFrom).toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </Td>
                <Td className="whitespace-nowrap text-xs text-ink-soft">
                  {price.validTo
                    ? new Date(price.validTo).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "—"}
                </Td>
                <Td>
                  <AdminBadge tone={pricePeriodTone(price.period)}>
                    {statusLabel(price.period)}
                  </AdminBadge>
                </Td>
                <Td className="whitespace-nowrap text-right text-[11px] font-semibold">
                  {canUpdate && (
                    <>
                      <Link
                        href={`/admin/products/prices/${price.id}/edit`}
                        className="text-navy hover:underline"
                      >
                        Edit
                      </Link>
                      <span className="mx-1.5 text-ink-faint">·</span>
                    </>
                  )}
                  {canCreate && <DeletePriceForm priceId={price.id} />}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={result.total}
          basePath="/admin/products/prices"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}