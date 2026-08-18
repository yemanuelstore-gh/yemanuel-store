import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { MapPinIcon, ArrowRightIcon } from "@/components/admin/icons";
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
import { getLocationsSummary } from "@/lib/admin/inventory-analytics";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Warehouses / Locations — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function AdminInventoryLocationsPage({
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
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const locations = await getLocationsSummary(q);
  const total = locations.length;
  const paged = locations.slice((page - 1) * pageSize, page * pageSize);

  const totals = locations.reduce(
    (acc, location) => ({
      inventoryValue: acc.inventoryValue + location.inventoryValue,
      units: acc.units + location.units,
      lowStock: acc.lowStock + location.lowStockCount,
    }),
    { inventoryValue: 0, units: 0, lowStock: 0 },
  );

  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);

  const canManageLocations = hasPermission(session, PERMISSIONS.settings.manage);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Warehouses / Locations"
        description={`${total} locations tracked across the business${q ? ` matching “${q}”` : ""}.`}
        actions={
          canManageLocations ? (
            <Link
              href="/admin/settings"
              className="inline-flex h-8 items-center rounded-md border border-line-strong bg-white px-3.5 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
            >
              Manage locations
            </Link>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Locations" value={String(total)} note="Stores and warehouses" />
        <KpiCard
          label="Inventory value"
          value={formatGHS(totals.inventoryValue)}
          note="On-hand × average cost"
        />
        <KpiCard label="Total units" value={String(totals.units)} note="Units on hand" />
        <KpiCard
          label="Low stock"
          value={String(totals.lowStock)}
          note="At or below reorder level"
          tone={totals.lowStock > 0 ? "danger" : "default"}
          href="/admin/inventory/low-stock"
        />
      </div>

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search locations by name or code…"
            initialValue={q}
          />
        </div>

        {paged.length === 0 ? (
          <AdminEmptyState
            title={q ? "No locations match your search" : "No locations yet"}
            message={
              q
                ? "Try a different name or code."
                : "Add your first store or warehouse from Settings."
            }
            actionHref={canManageLocations ? "/admin/settings" : undefined}
            actionLabel={canManageLocations ? "Add a location" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th></Th>
                <Th>Location</Th>
                <Th>Code</Th>
                <Th>Status</Th>
                <Th className="text-right">SKUs</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Inventory value</Th>
                <Th className="text-right">Low stock</Th>
                <Th></Th>
              </>
            }
          >
            {paged.map((location) => (
              <tr key={location.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="pl-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-paper/60 text-ink-soft">
                    <MapPinIcon className="h-3.5 w-3.5" />
                  </span>
                </Td>
                <Td>
                  <Link
                    href={`/admin/inventory/locations/${location.id}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {location.name}
                  </Link>
                  <span className="ml-1.5 text-[11px] text-ink-faint">
                    {location.city}
                    {location.regionName ? ` · ${location.regionName}` : ""}
                  </span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">{location.code}</span>
                </Td>
                <Td>
                  <AdminBadge tone={entityStatusTone(location.status)}>
                    {statusLabel(location.status)}
                  </AdminBadge>
                </Td>
                <Td className="text-right tabular-nums">{location.skuCount}</Td>
                <Td className="text-right tabular-nums text-ink-soft">{location.units}</Td>
                <Td className="whitespace-nowrap text-right font-semibold tabular-nums">
                  {formatGHS(location.inventoryValue)}
                </Td>
                <Td className="text-right">
                  {location.lowStockCount > 0 ? (
                    <span className="font-semibold tabular-nums text-danger">
                      {location.lowStockCount}
                    </span>
                  ) : (
                    <span className="text-ink-faint">—</span>
                  )}
                </Td>
                <Td className="pr-4">
                  <Link
                    href={`/admin/inventory/locations/${location.id}`}
                    className="inline-flex h-7 items-center gap-1 rounded-md border border-line-strong bg-white px-2 text-xs font-medium text-ink-soft transition-colors hover:bg-line/40 hover:text-ink"
                  >
                    View
                    <ArrowRightIcon className="h-3 w-3" />
                  </Link>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          basePath="/admin/inventory/locations"
          searchParams={filterParams}
        />
      </div>

      {canManageLocations && (
        <p className="text-[11px] leading-5 text-ink-faint">
          Locations are created and their status managed from{" "}
          <Link href="/admin/settings" className="font-medium text-navy hover:underline">
            Settings
          </Link>
          . This page reports inventory held at each location.
        </p>
      )}
    </div>
  );
}