import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { HBarList } from "@/components/admin/dashboard/charts";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { BanknoteIcon } from "@/components/admin/icons";
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
  getValuationRows,
  getValuationSummary,
  stockStatusFor,
  type LowStockStatusFilter,
  type ValuationSort,
} from "@/lib/admin/inventory-analytics";
import { getLocations } from "@/lib/admin/inventory";
import { getCategoriesForSelect } from "@/lib/admin/products";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Stock Valuation — Yemanuel Store Admin",
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
  { value: "all", label: "All stock" },
  { value: "out", label: "Out of stock" },
  { value: "low", label: "Low stock" },
];

const SORT_OPTIONS: { value: ValuationSort; label: string }[] = [
  { value: "name", label: "Product name" },
  { value: "value", label: "Highest inventory value" },
  { value: "units", label: "Most units on hand" },
];

export default async function AdminValuationPage({
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
  const sort: ValuationSort =
    params.sort === "value" || params.sort === "units" ? params.sort : "name";
  const page = Math.max(1, Number(params.page) || 1);

  const [summary, result, locations, categories] = await Promise.all([
    getValuationSummary(locationId || undefined, categoryId || undefined),
    getValuationRows({
      locationId: locationId || undefined,
      categoryId: categoryId || undefined,
      q: q || undefined,
      status,
      sort,
      page,
    }),
    getLocations(),
    getCategoriesForSelect(),
  ]);

  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);
  if (locationId) filterParams.set("location", locationId);
  if (categoryId) filterParams.set("category", categoryId);
  if (status !== "all") filterParams.set("status", status);
  if (sort !== "name") filterParams.set("sort", sort);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Valuation"
        description={`${result.total} inventory records — valued at on-hand quantity × average cost (GH₵).`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          label="Total value"
          value={summary ? formatGHS(summary.totalValue) : "—"}
          note="On-hand × average cost"
        />
        <KpiCard
          label="Units"
          value={summary ? String(summary.totalUnits) : "—"}
          note="Units on hand"
        />
        <KpiCard label="SKUs" value={summary ? String(summary.skuCount) : "—"} note="Variants tracked" />
        <KpiCard
          label="Locations"
          value={summary ? String(summary.locationCount) : "—"}
          note="Locations with stock"
        />
        <KpiCard
          label="Low stock value"
          value={summary ? formatGHS(summary.lowStockValue) : "—"}
          note="Value of affected lines"
          tone={summary && summary.lowStockValue > 0 ? "gold" : "default"}
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

        {summary && (summary.byLocation.length > 0 || summary.byCategory.length > 0) && (
          <div className="grid gap-4 border-b border-line px-4 py-4 lg:grid-cols-2">
            <div>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                Valuation by location
              </h2>
              <HBarList
                data={summary.byLocation.map((row) => ({
                  label: row.locationName,
                  value: row.value,
                }))}
                formatValue={(value) => formatGHS(value)}
              />
            </div>
            <div>
              <h2 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
                Valuation by category
              </h2>
              <HBarList
                data={summary.byCategory.map((row) => ({
                  label: row.categoryName,
                  value: row.value,
                }))}
                formatValue={(value) => formatGHS(value)}
              />
            </div>
          </div>
        )}

        {result.rows.length === 0 ? (
          <AdminEmptyState
            title="No inventory records"
            message="Inventory records appear when stock is tracked for a variant at a location."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Product</Th>
                <Th>Variant</Th>
                <Th>SKU</Th>
                <Th>Location</Th>
                <Th className="text-right">On hand</Th>
                <Th className="text-right">Reserved</Th>
                <Th className="text-right">Available</Th>
                <Th className="text-right">Avg cost</Th>
                <Th className="text-right">Value</Th>
                <Th className="text-right">Reorder</Th>
                <Th>Status</Th>
              </>
            }
          >
            {result.rows.map((item) => {
              const status = stockStatusFor(item.available, item.reorderLevel);
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
                    <Link
                      href={`/admin/inventory/locations/${item.locationId}`}
                      className="text-xs text-ink-soft hover:text-navy hover:underline"
                    >
                      {item.locationName}
                    </Link>
                  </Td>
                  <Td className="text-right font-semibold tabular-nums">{item.quantityOnHand}</Td>
                  <Td className="text-right text-ink-soft tabular-nums">{item.reservedQuantity}</Td>
                  <Td className="text-right font-medium tabular-nums">{item.available}</Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft tabular-nums">
                    {formatGHS(item.averageCost)}
                  </Td>
                  <Td className="whitespace-nowrap text-right font-semibold tabular-nums">
                    {formatGHS(item.inventoryValue)}
                  </Td>
                  <Td className="text-right text-ink-soft tabular-nums">
                    {item.reorderLevel ?? "—"}
                  </Td>
                  <Td>
                    <AdminBadge
                      tone={status === "out" ? "danger" : status === "low" ? "warning" : "success"}
                    >
                      {status === "out"
                        ? "OUT OF STOCK"
                        : status === "low"
                          ? "LOW STOCK"
                          : "HEALTHY"}
                    </AdminBadge>
                  </Td>
                </tr>
              );
            })}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/inventory/valuation"
          searchParams={filterParams}
        />
      </div>

      <p className="flex items-center gap-1.5 text-[11px] leading-5 text-ink-faint">
        <BanknoteIcon className="h-3.5 w-3.5 shrink-0" />
        Valuation is based on the existing average cost field per inventory
        record (quantity on hand × average cost). It is a reporting figure and
        does not claim FIFO / LIFO or weighted-average accounting.
      </p>
    </div>
  );
}