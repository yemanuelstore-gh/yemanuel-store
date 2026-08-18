import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { MapPinIcon, WarehouseIcon } from "@/components/admin/icons";
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
  getLocationsSummary,
  stockStatusFor,
} from "@/lib/admin/inventory-analytics";
import { getInventory } from "@/lib/admin/inventory";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";
import { formatGHS, formatGhanaPhone } from "@/lib/format";

export const metadata: Metadata = {
  title: "Location — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function AdminLocationDetailPage({
  params,
  searchParams,
}: {
  params: Props["params"];
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return <UnauthorizedPage message="Your account does not have the inventory.read permission." />;
  }

  const { id } = await params;
  const q = (await searchParams).q?.trim() ?? "";
  const page = Math.max(1, Number((await searchParams).page) || 1);

  const [locations, inventory] = await Promise.all([
    getLocationsSummary(),
    getInventory({ q: q || undefined, locationId: id, page }),
  ]);

  const location = locations.find((row) => row.id === id);
  if (!location) notFound();

  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);

  const addressParts = [
    location.addressLine1,
    location.addressLine2,
    location.city,
    location.regionName,
  ].filter((part): part is string => Boolean(part));

  return (
    <div className="space-y-4">
      <PageHeader
        title={location.name}
        description={`${location.code} · ${statusLabel(location.locationType)}`}
        actions={
          <>
            <Link
              href="/admin/inventory/locations"
              className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
            >
              All locations
            </Link>
            <Link
              href={`/admin/inventory?location=${location.id}`}
              className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
            >
              Stock overview
            </Link>
            <Link
              href={`/admin/inventory/low-stock?location=${location.id}`}
              className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
            >
              Low stock here
            </Link>
          </>
        }
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-paper/60 text-navy">
            <WarehouseIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-ink">{location.name}</h2>
              <span className="font-mono text-[11px] text-ink-faint">{location.code}</span>
              <AdminBadge tone={entityStatusTone(location.status)}>
                {statusLabel(location.status)}
              </AdminBadge>
            </div>
            <p className="mt-0.5 text-xs leading-5 text-ink-soft">
              {location.locationType === "warehouse" ? "Warehouse" : "Store"} ·{" "}
              {addressParts.join(", ") || "No address on file"}
              {location.phone ? ` · ${formatGhanaPhone(location.phone)}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link
              href="/admin/inventory/movements"
              className="text-xs font-medium text-navy hover:underline"
            >
              Stock movements
            </Link>
            <Link
              href="/admin/inventory/transfers"
              className="text-xs font-medium text-navy hover:underline"
            >
              Stock transfers
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="SKUs" value={String(location.skuCount)} note="Variants stocked" />
        <KpiCard label="Units" value={String(location.units)} note="Units on hand" />
        <KpiCard
          label="Inventory value"
          value={formatGHS(location.inventoryValue)}
          note="On-hand × average cost"
        />
        <KpiCard
          label="Low stock"
          value={String(location.lowStockCount)}
          note="At or below reorder level"
          tone={location.lowStockCount > 0 ? "danger" : "default"}
          href={`/admin/inventory/low-stock?location=${location.id}`}
        />
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search product, variant or SKU…"
            initialValue={q}
          />
        </div>

        {inventory.items.length === 0 ? (
          <AdminEmptyState
            title={q ? "No inventory records match your search" : "No inventory at this location"}
            message={
              q
                ? "Try a different search term."
                : "Stock records for this location will appear here once stock is tracked."
            }
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Product</Th>
                <Th>Variant</Th>
                <Th>SKU</Th>
                <Th className="text-right">Quantity</Th>
                <Th className="text-right">Reserved</Th>
                <Th className="text-right">Available</Th>
                <Th className="text-right">Average cost</Th>
                <Th className="text-right">Value</Th>
                <Th className="text-right">Reorder level</Th>
                <Th>Status</Th>
              </>
            }
          >
            {inventory.items.map((item) => {
              const status = stockStatusFor(item.available, item.reorderLevel);
              const value = item.quantityOnHand * item.averageCost;
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
                  <Td className="text-right font-semibold tabular-nums">
                    {item.quantityOnHand}
                  </Td>
                  <Td className="text-right text-ink-soft tabular-nums">
                    {item.reservedQuantity}
                  </Td>
                  <Td className="text-right font-medium tabular-nums">{item.available}</Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft tabular-nums">
                    {formatGHS(item.averageCost)}
                  </Td>
                  <Td className="whitespace-nowrap text-right font-semibold tabular-nums">
                    {formatGHS(value)}
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
          total={inventory.total}
          basePath={`/admin/inventory/locations/${location.id}`}
          searchParams={filterParams}
        />
      </div>

      <p className="flex items-center gap-1.5 text-[11px] leading-5 text-ink-faint">
        <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
        Inventory figures are reported at on-hand quantities and are read-only
        from this page. Use Stock Adjustments for any quantity changes.
      </p>
    </div>
  );
}