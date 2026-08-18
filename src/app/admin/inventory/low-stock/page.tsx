import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { AlertTriangleIcon } from "@/components/admin/icons";
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
import {
  getLowStockSkus,
  getLowStockSummary,
  type LowStockSort,
  type LowStockStatusFilter,
} from "@/lib/admin/inventory-analytics";
import { getLocations } from "@/lib/admin/inventory";
import { getCategoriesForSelect } from "@/lib/admin/products";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Low Stock — Yemanuel Store Admin",
};

type SearchParams = Promise<{
  q?: string;
  location?: string;
  category?: string;
  status?: string;
  sort?: string;
  page?: string;
}>;

const STATUS_OPTIONS: { value: LowStockStatusFilter; label: string }[] = [
  { value: "all", label: "All affected" },
  { value: "out", label: "Out of stock" },
  { value: "low", label: "Low stock" },
];

const SORT_OPTIONS: { value: LowStockSort; label: string }[] = [
  { value: "available", label: "Lowest available quantity" },
  { value: "shortage", label: "Largest shortage" },
  { value: "value", label: "Highest inventory value" },
  { value: "name", label: "Product name" },
];

export default async function AdminLowStockPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return <UnauthorizedPage message="Your account does not have the inventory.read permission." />;
  }

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const locationId = params.location ?? "";
  const categoryId = params.category ?? "";
  const status: LowStockStatusFilter =
    params.status === "out" || params.status === "low" ? params.status : "all";
  const sort: LowStockSort =
    params.sort === "shortage" || params.sort === "value" || params.sort === "name"
      ? params.sort
      : "available";
  const page = Math.max(1, Number(params.page) || 1);

  const [summary, result, locations, categories] = await Promise.all([
    getLowStockSummary(locationId || undefined),
    getLowStockSkus({
      locationId: locationId || undefined,
      q: q || undefined,
      categoryId: categoryId || undefined,
      status,
      sort,
      page,
    }),
    getLocations(),
    getCategoriesForSelect(),
  ]);

  const canOrder = hasPermission(session, PERMISSIONS.purchases.create);

  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);
  if (locationId) filterParams.set("location", locationId);
  if (categoryId) filterParams.set("category", categoryId);
  if (status !== "all") filterParams.set("status", status);
  if (sort !== "available") filterParams.set("sort", sort);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Low Stock"
        description={`${result.total} affected stock record${result.total === 1 ? "" : "s"} (${summary ? summary.affectedSkus : 0} distinct SKUs) at or below reorder level.`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="Out of stock"
          value={summary ? String(summary.outOfStockCount) : "—"}
          note="Available ≤ 0"
          tone={summary && summary.outOfStockCount > 0 ? "danger" : "default"}
        />
        <KpiCard
          label="Low stock"
          value={summary ? String(summary.lowStockCount) : "—"}
          note="Available ≤ reorder level"
          tone={summary && summary.lowStockCount > 0 ? "gold" : "default"}
        />
        <KpiCard
          label="Affected SKUs"
          value={summary ? String(summary.affectedSkus) : "—"}
          note="Distinct variants at risk"
        />
        <KpiCard
          label="At-risk value"
          value={summary ? formatGHS(summary.atRiskValue) : "—"}
          note="On-hand value of affected lines"
          tone={summary && summary.atRiskValue > 0 ? "gold" : "default"}
        />
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search product, variant, SKU or barcode…"
            initialValue={q}
            extraFields={
              <>
                <select
                  name="location"
                  defaultValue={locationId}
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
                  name="status"
                  defaultValue={status}
                  aria-label="Filter by stock status"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  name="sort"
                  defaultValue={sort}
                  aria-label="Sort results"
                  className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Sort: {option.label}
                    </option>
                  ))}
                </select>
              </>
            }
          />
        </div>

        {result.rows.length === 0 ? (
          <AdminEmptyState
            title="No low stock SKUs"
            message={
              summary && summary.affectedSkus > 0
                ? "No results match the current filters."
                : "Every tracked SKU is above its reorder level."
            }
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Product</Th>
                <Th>Variant</Th>
                <Th>SKU</Th>
                <Th>Barcode</Th>
                <Th>Location</Th>
                <Th className="text-right">On hand</Th>
                <Th className="text-right">Reserved</Th>
                <Th className="text-right">Available</Th>
                <Th className="text-right">Reorder</Th>
                <Th className="text-right">Shortage</Th>
                <Th className="text-right">Avg cost</Th>
                <Th className="text-right">Value</Th>
                <Th>Status</Th>
                {canOrder && <Th></Th>}
              </>
            }
          >
            {result.rows.map((item) => {
              const isOut = item.available <= 0;
              return (
                <tr key={item.id} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <Link
                      href={`/admin/products/${item.productId}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {item.productName}
                    </Link>
                  </Td>
                  <Td className="text-ink">{item.variantName}</Td>
                  <Td>
                    <span className="font-mono text-xs text-ink-soft">{item.sku}</span>
                  </Td>
                  <Td>
                    {item.barcode ? (
                      <span className="font-mono text-xs text-ink-faint">{item.barcode}</span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/inventory/locations/${item.locationId}`}
                      className="text-xs text-ink-soft hover:text-navy hover:underline"
                    >
                      {item.locationName}
                    </Link>
                  </Td>
                  <Td className="text-right font-semibold tabular-nums">{item.quantityOnHand}</Td>
                  <Td className="text-right text-ink-soft tabular-nums">{item.reservedQuantity}</Td>
                  <Td className="text-right font-semibold tabular-nums text-danger">
                    {item.available}
                  </Td>
                  <Td className="text-right text-ink-soft tabular-nums">
                    {item.reorderLevel ?? "—"}
                  </Td>
                  <Td className="text-right font-medium tabular-nums">
                    {item.shortage > 0 ? item.shortage : <span className="text-ink-faint">—</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft tabular-nums">
                    {formatGHS(item.averageCost)}
                  </Td>
                  <Td className="whitespace-nowrap text-right font-semibold tabular-nums">
                    {formatGHS(item.inventoryValue)}
                  </Td>
                  <Td>
                    <AdminBadge tone={isOut ? "danger" : "warning"}>
                      {isOut ? "OUT OF STOCK" : "LOW STOCK"}
                    </AdminBadge>
                  </Td>
                  {canOrder && (
                    <Td className="pr-4">
                      <Link
                        href="/admin/purchases/orders"
                        className="inline-flex h-7 items-center rounded-md border border-line-strong bg-white px-2 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
                        title="Create a purchase order"
                      >
                        Order
                      </Link>
                    </Td>
                  )}
                </tr>
              );
            })}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/inventory/low-stock"
          searchParams={filterParams}
        />
      </div>

      <p className="flex items-center gap-1.5 text-[11px] leading-5 text-ink-faint">
        <AlertTriangleIcon className="h-3.5 w-3.5 shrink-0" />
        Available = on hand − reserved. Shortage = max(reorder level −
        available, 0). This page reports only — quantities are changed through
        Stock Adjustments, Transfers or purchase receipts.
      </p>
    </div>
  );
}