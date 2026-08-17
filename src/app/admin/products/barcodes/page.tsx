import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AssignBarcodeForm, ClearBarcodeForm } from "@/components/admin/barcodes/barcode-forms";
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
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { barcodeStatusTone, entityStatusTone, statusLabel } from "@/lib/admin/labels";
import { getBarcodeCounts, getBarcodeList, resolveBarcode } from "@/lib/admin/variants";

export const metadata: Metadata = {
  title: "Barcodes — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; page?: string }>;

export default async function AdminBarcodesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.products.update);
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return <UnauthorizedPage message="Your account does not have the products.read permission." />;
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;
  const term = params.q?.trim() ?? "";

  const [result, counts, exactMatch] = await Promise.all([
    getBarcodeList({ q: params.q, page, pageSize }),
    getBarcodeCounts(),
    term !== "" ? resolveBarcode(term) : Promise.resolve(null),
  ]);

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Barcodes"
        description="Assign and manage barcodes for scanner-based lookup at the register."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Assigned barcodes
          </p>
          <p className="mt-1 text-2xl font-semibold text-navy">{counts.assigned}</p>
        </div>
        <div className="rounded-lg border border-line bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Unassigned variants
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink">{counts.unassigned}</p>
        </div>
        <div className="rounded-lg border border-line bg-white px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-soft">
            Matching results
          </p>
          <p className="mt-1 text-2xl font-semibold text-ink-soft">{result.total}</p>
        </div>
      </div>

      {exactMatch && (
        <div className="rounded-lg border border-navy/25 bg-navy-soft/50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-navy">
                Scanner lookup — barcode {term}
              </p>
              <p className="mt-1 text-[13px] font-semibold text-ink">
                {exactMatch.productName} · {exactMatch.name}
                <span className="ml-2 font-mono text-xs font-normal text-ink-soft">
                  {exactMatch.sku}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold">
              <Link
                href={`/admin/products/variants/${exactMatch.id}`}
                className="text-navy hover:underline"
              >
                View variant
              </Link>
              <span className="text-ink-faint">·</span>
              <Link
                href={`/admin/products/${exactMatch.productId}`}
                className="text-navy hover:underline"
              >
                View product
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border border-line bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Scan or search barcode, SKU, product…"
            initialValue={params.q ?? ""}
          />
        </div>

        {result.barcodes.length === 0 ? (
          <AdminEmptyState
            title="No barcode records found"
            message="Scan a barcode or search by barcode, SKU, product or variant name."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Product</Th>
                <Th>Variant</Th>
                <Th>SKU</Th>
                <Th>Barcode</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {result.barcodes.map((variant) => (
              <tr key={variant.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/products/${variant.productId}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {variant.productName}
                  </Link>
                </Td>
                <Td>
                  <Link
                    href={`/admin/products/variants/${variant.id}`}
                    className="font-semibold text-ink hover:underline"
                  >
                    {variant.name}
                  </Link>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">{variant.sku}</span>
                </Td>
                <Td>
                  {variant.barcode ? (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs tracking-wider text-navy">
                        {variant.barcode}
                      </span>
                      <AdminBadge tone={barcodeStatusTone("assigned")}>Assigned</AdminBadge>
                    </div>
                  ) : (
                    <AdminBadge tone={barcodeStatusTone("unassigned")}>Unassigned</AdminBadge>
                  )}
                </Td>
                <Td>
                  <AdminBadge tone={entityStatusTone(variant.status)}>
                    {statusLabel(variant.status)}
                  </AdminBadge>
                </Td>
                <Td className="text-right">
                  <span className="text-[11px] font-semibold">
                    <Link
                      href={`/admin/products/variants/${variant.id}`}
                      className="text-navy hover:underline"
                    >
                      View
                    </Link>
                    {canUpdate && (
                      <>
                        <span className="mx-1.5 text-ink-faint">·</span>
                        <details className="group inline-block text-left">
                          <summary className="cursor-pointer text-navy hover:underline">
                            {variant.barcode ? "Edit" : "Assign"}
                          </summary>
                          <div className="absolute right-4 z-10 mt-2 w-72 rounded-md border border-line bg-white p-3 shadow-lg">
                            <AssignBarcodeForm
                              variantId={variant.id}
                              initialBarcode={variant.barcode}
                            />
                            {variant.barcode && (
                              <div className="mt-2 flex justify-end border-t border-line pt-2">
                                <ClearBarcodeForm variantId={variant.id} />
                              </div>
                            )}
                          </div>
                        </details>
                      </>
                    )}
                  </span>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}

        <Pagination
          page={page}
          pageSize={pageSize}
          total={result.total}
          basePath="/admin/products/barcodes"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}