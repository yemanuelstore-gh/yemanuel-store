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
import { getInventory, getLocations } from "@/lib/admin/inventory";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Inventory — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; location?: string; page?: string }>;

export default async function AdminInventoryPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.inventory.read)) {
    return <UnauthorizedPage message="Your account does not have the inventory.read permission." />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [result, locations] = await Promise.all([
    getInventory({ q: params.q, locationId: params.location, page }),
    getLocations(),
  ]);

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.location) filterParams.set("location", params.location);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Inventory"
        description={`${result.total} inventory records across ${locations.length} locations.`}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search by product name or SKU…"
            initialValue={params.q ?? ""}
            extraFields={
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
            }
          />
        </div>

        {result.items.length === 0 ? (
          <AdminEmptyState
            title="No inventory records"
            message="Inventory records appear when stock is tracked for a variant at a location."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Location</Th>
                <Th>Product</Th>
                <Th>Variant</Th>
                <Th>SKU</Th>
                <Th className="text-right">On hand</Th>
                <Th className="text-right">Reserved</Th>
                <Th className="text-right">Available</Th>
                <Th className="text-right">Avg cost</Th>
                <Th className="text-right">Reorder level</Th>
                <Th className="text-right">Reorder qty</Th>
              </>
            }
          >
            {result.items.map((item) => (
              <tr key={item.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="whitespace-nowrap text-ink-soft">{item.locationName}</Td>
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
                <Td className="text-right font-semibold">{item.quantityOnHand}</Td>
                <Td className="text-right text-ink-soft">{item.reservedQuantity}</Td>
                <Td className="text-right font-medium">{item.available}</Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {formatGHS(item.averageCost)}
                </Td>
                <Td className="text-right text-ink-soft">{item.reorderLevel ?? "—"}</Td>
                <Td className="text-right text-ink-soft">{item.reorderQuantity ?? "—"}</Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/inventory"
          searchParams={filterParams}
        />
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Locations</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {locations.map((location) => (
            <span
              key={location.id}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2.5 py-1 text-xs text-ink-soft"
            >
              {location.name}
              <span className="font-mono text-[10px] text-ink-faint">{location.code}</span>
              <AdminBadge tone={entityStatusTone(location.status)}>
                {statusLabel(location.status)}
              </AdminBadge>
            </span>
          ))}
          {locations.length === 0 && (
            <p className="text-xs text-ink-soft">No locations configured yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}