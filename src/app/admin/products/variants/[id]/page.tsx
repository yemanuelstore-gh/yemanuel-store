import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { DeleteImageForm, DeletePriceForm } from "@/components/admin/product-forms";
import { VariantImageForm } from "@/components/admin/variants/variant-forms";
import {
  AdminButtonLink,
  AdminEmptyState,
  AdminTable,
  DataRow,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatGHS } from "@/lib/format";
import {
  entityStatusTone,
  pricePeriodTone,
  priceTypeTone,
  statusLabel,
} from "@/lib/admin/labels";
import { getVariantById } from "@/lib/admin/variants";

export const metadata: Metadata = {
  title: "Variant — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminVariantDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canCreate = hasPermission(session, PERMISSIONS.products.create);
  const canUpdate = hasPermission(session, PERMISSIONS.products.update);
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return <UnauthorizedPage message="Your account does not have the products.read permission." />;
  }

  const { id } = await params;
  const variant = await getVariantById(id);
  if (!variant) notFound();

  const optionEntries = variant.options
    ? Object.entries(variant.options).map(([key, value]) => `${key}: ${String(value)}`)
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={variant.name}
        description={`${variant.productName} · SKU ${variant.sku}`}
        actions={
          <>
            <AdminBadge tone={entityStatusTone(variant.status)}>
              {statusLabel(variant.status)}
            </AdminBadge>
            {canUpdate && (
              <AdminButtonLink
                href={`/admin/products/variants/${variant.id}/edit`}
                variant="secondary"
              >
                Edit variant
              </AdminButtonLink>
            )}
            <AdminButtonLink href={`/admin/products/${variant.productId}`} variant="secondary">
              View product
            </AdminButtonLink>
          </>
        }
      />

      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Variant details
          </h2>
          <Link
            href="/admin/products/variants"
            className="text-[11px] font-semibold text-navy hover:underline"
          >
            ← All variants
          </Link>
        </div>
        <dl className="max-w-2xl">
          <DataRow
            label="Product"
            value={
              <Link
                href={`/admin/products/${variant.productId}`}
                className="text-navy hover:underline"
              >
                {variant.productName}
              </Link>
            }
          />
          <DataRow label="SKU" value={<span className="font-mono text-[13px]">{variant.sku}</span>} />
          <DataRow
            label="Barcode"
            value={
              variant.barcode ? (
                <span className="font-mono text-[13px] tracking-wider text-navy">
                  {variant.barcode}
                </span>
              ) : (
                "—"
              )
            }
          />
          <DataRow
            label="Options"
            value={
              optionEntries.length > 0 ? optionEntries.join(" · ") : "—"
            }
          />
          <DataRow
            label="Status"
            value={
              <AdminBadge tone={entityStatusTone(variant.status)}>
                {statusLabel(variant.status)}
              </AdminBadge>
            }
          />
          <DataRow
            label="Created"
            value={new Date(variant.createdAt).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
          <DataRow
            label="Updated"
            value={new Date(variant.updatedAt).toLocaleString("en-GB", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          />
        </dl>
      </section>

      <section className="rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Pricing
          </h2>
          <span className="text-[11px] text-ink-faint">
            Selling and sale prices for this variant
          </span>
        </div>
        {variant.prices.length === 0 ? (
          <AdminEmptyState
            title="No prices yet"
            message="Add a price to make this variant sellable at the register and storefront."
            actionHref={
              canCreate
                ? `/admin/products/prices/new?variant=${variant.id}&product=${variant.productId}`
                : undefined
            }
            actionLabel={canCreate ? "Add price" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Type</Th>
                <Th>Location</Th>
                <Th className="text-right">Amount</Th>
                <Th>Valid from</Th>
                <Th>Valid to</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {variant.prices.map((price) => (
              <tr key={price.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <AdminBadge tone={priceTypeTone(price.priceType)}>
                    {statusLabel(price.priceType)}
                  </AdminBadge>
                </Td>
                <Td className="text-ink-soft">{price.locationName ?? "All locations"}</Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {formatGHS(price.amount)}
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
        {canCreate && (
          <div className="border-t border-line p-4">
            <AdminButtonLink
              href={`/admin/products/prices/new?variant=${variant.id}&product=${variant.productId}`}
              variant="secondary"
            >
              + Add price
            </AdminButtonLink>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Inventory
          </h2>
          <span className="text-[11px] text-ink-faint">
            Stock per location — managed under Inventory
          </span>
        </div>
        {variant.inventory.length === 0 ? (
          <AdminEmptyState
            title="No stock recorded"
            message="This variant has no inventory items yet. Stock is recorded under Inventory."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Location</Th>
                <Th className="text-right">On hand</Th>
                <Th className="text-right">Reserved</Th>
                <Th className="text-right">Available</Th>
                <Th className="text-right">Reorder level</Th>
              </>
            }
          >
            {variant.inventory.map((item) => (
              <tr key={item.locationId}>
                <Td className="font-medium">{item.locationName}</Td>
                <Td className="whitespace-nowrap text-right">{item.quantityOnHand}</Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {item.reservedQuantity}
                </Td>
                <Td className="whitespace-nowrap text-right font-medium">
                  {item.quantityOnHand - item.reservedQuantity}
                </Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {item.reorderLevel ?? "—"}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Images
          </h2>
          <span className="text-[11px] text-ink-faint">
            Variant images on top · product images below
          </span>
        </div>
        {variant.variantImages.length === 0 && variant.productImages.length === 0 ? (
          <AdminEmptyState
            title="No images"
            message="Add a variant-specific image here, or manage product images on the product page."
          />
        ) : (
          <ul className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {variant.variantImages.map((image) => (
              <li key={image.id} className="rounded-md border border-line p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.altText ?? variant.name}
                  className="h-32 w-full rounded object-cover"
                  loading="lazy"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-navy">Variant image</span>
                  {canCreate && <DeleteImageForm imageId={image.id} />}
                </div>
              </li>
            ))}
            {variant.productImages.map((image) => (
              <li key={image.id} className="rounded-md border border-line p-3 opacity-80">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.altText ?? variant.productName}
                  className="h-32 w-full rounded object-cover"
                  loading="lazy"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-ink-soft">
                    {image.isPrimary ? "Product primary" : "Product image"}
                  </span>
                  <Link
                    href={`/admin/products/${variant.productId}`}
                    className="text-[11px] font-semibold text-navy hover:underline"
                  >
                    Manage
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
        {canCreate && (
          <div className="border-t border-line p-4">
            <VariantImageForm productId={variant.productId} variantId={variant.id} />
          </div>
        )}
      </section>
    </div>
  );
}