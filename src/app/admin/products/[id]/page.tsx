import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  DeleteImageForm,
  DeletePriceForm,
  ImageForm,
  PriceForm,
  ProductForm,
  VariantForm,
  VariantStatusBadge,
} from "@/components/admin/product-forms";
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
  getBrandsForSelect,
  getCategoriesForSelect,
  getLocationsForSelect,
  getProductById,
  getProductImages,
  getVariantsForProduct,
} from "@/lib/admin/products";
import { productStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Product — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  const canUpdate = hasPermission(session, PERMISSIONS.products.update);
  const canCreate = hasPermission(session, PERMISSIONS.products.create);
  if (!hasPermission(session, PERMISSIONS.products.read)) {
    return <UnauthorizedPage message="Your account does not have the products.read permission." />;
  }

  const { id } = await params;
  const [product, categories, brands, locations, variants, images] = await Promise.all([
    getProductById(id),
    getCategoriesForSelect(),
    getBrandsForSelect(),
    getLocationsForSelect(),
    getVariantsForProduct(id),
    getProductImages(id),
  ]);

  if (!product) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        description={`${product.categories?.name ?? "No category"} · ${
          product.brands?.name ?? "No brand"
        } · Updated ${new Date(product.updated_at).toLocaleDateString("en-GB")}`}
        actions={
          <>
            <AdminBadge tone={productStatusTone(product.status)}>
              {statusLabel(product.status)}
            </AdminBadge>
            {product.status === "active" && (
              <AdminButtonLink href={`/shop/${product.slug}`} variant="secondary">
                View on storefront
              </AdminButtonLink>
            )}
          </>
        }
      />

      <section className="rounded-lg border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Product details
          </h2>
          <Link href="/admin/products" className="text-[11px] font-semibold text-navy hover:underline">
            ← All products
          </Link>
        </div>
        {canUpdate ? (
          <ProductForm
            action="update"
            categories={categories}
            brands={brands}
            initial={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              categoryId: product.category_id,
              brandId: product.brand_id,
              status: product.status,
              description: product.description,
            }}
          />
        ) : (
          <dl className="max-w-2xl">
            <DataRow label="Name" value={product.name} />
            <DataRow label="Slug" value={product.slug} />
            <DataRow label="Description" value={product.description ?? "—"} />
          </dl>
        )}
      </section>

      <section className="rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Variants
          </h2>
          <span className="text-[11px] text-ink-faint">
            SKUs, barcodes and options live on variants
          </span>
        </div>
        {variants.length === 0 ? (
          <AdminEmptyState
            title="No variants yet"
            message="Add a variant to give this product a SKU and a price."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Variant</Th>
                <Th>SKU</Th>
                <Th>Barcode</Th>
                <Th>Options</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </>
            }
          >
            {variants.map((variant) => (
              <tr key={variant.id} className="transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{variant.name}</Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">{variant.sku}</span>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">
                    {variant.barcode ?? "—"}
                  </span>
                </Td>
                <Td className="max-w-48 truncate text-xs text-ink-soft">
                  {variant.options
                    ? Object.entries(variant.options)
                        .map(([key, value]) => `${key}: ${String(value)}`)
                        .join(", ")
                    : "—"}
                </Td>
                <Td>
                  <VariantStatusBadge status={variant.status} />
                </Td>
                <Td>
                  <details className="group">
                    <summary className="cursor-pointer text-[11px] font-semibold text-navy hover:underline">
                      Edit
                    </summary>
                    <div className="mt-2 rounded-md border border-line bg-white p-3">
                      <VariantForm
                        productId={product.id}
                        initial={{
                          id: variant.id,
                          name: variant.name,
                          sku: variant.sku,
                          barcode: variant.barcode,
                          options: variant.options,
                          status: variant.status,
                        }}
                      />
                    </div>
                  </details>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
        {canCreate && (
          <div className="border-t border-line p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Add variant
            </h3>
            <VariantForm productId={product.id} />
          </div>
        )}
      </section>

      {variants.length > 0 && (
        <section className="rounded-lg border border-line bg-white">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
              Prices
            </h2>
            <span className="text-[11px] text-ink-faint">
              Selling and sale prices per variant
            </span>
          </div>
          {variants.map((variant) => (
            <div key={variant.id} className="border-b border-line last:border-b-0">
              <div className="px-4 pt-3 text-[13px] font-medium text-ink">
                {variant.name}
                <span className="ml-2 font-mono text-[11px] font-normal text-ink-faint">
                  {variant.sku}
                </span>
              </div>
              <AdminTable
                head={
                  <>
                    <Th>Type</Th>
                    <Th>Location</Th>
                    <Th className="text-right">Amount</Th>
                    <Th>Valid from</Th>
                    <Th>Valid to</Th>
                    <Th className="text-right">Actions</Th>
                  </>
                }
              >
                {variant.prices.length === 0 ? (
                  <tr>
                    <Td colSpan={6} className="text-center text-xs text-ink-faint">
                      No prices yet.
                    </Td>
                  </tr>
                ) : (
                  variant.prices.map((price) => (
                    <tr key={price.id}>
                      <Td className="capitalize">{price.priceType}</Td>
                      <Td className="text-ink-soft">
                        {locations.find((location) => location.id === price.locationId)?.name ??
                          "All locations"}
                      </Td>
                      <Td className="whitespace-nowrap text-right font-medium">
                        {formatGHS(price.amount)}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-ink-soft">
                        {new Date(price.validFrom).toLocaleDateString("en-GB")}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-ink-soft">
                        {price.validTo
                          ? new Date(price.validTo).toLocaleDateString("en-GB")
                          : "—"}
                      </Td>
                      <Td className="text-right">
                        {canCreate && <DeletePriceForm priceId={price.id} />}
                      </Td>
                    </tr>
                  ))
                )}
              </AdminTable>
              {canCreate && (
                <div className="border-t border-line p-4">
                  <PriceForm variantId={variant.id} locations={locations} />
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="rounded-lg border border-line bg-white">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
            Images
          </h2>
          <span className="text-[11px] text-ink-faint">One primary image per product</span>
        </div>
        {images.length === 0 ? (
          <AdminEmptyState
            title="No images yet"
            message="Add image URLs to display this product on the storefront."
          />
        ) : (
          <ul className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((image) => (
              <li key={image.id} className="rounded-md border border-line p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.url}
                  alt={image.altText ?? product.name}
                  className="h-32 w-full rounded object-cover"
                  loading="lazy"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-ink-soft">
                    {image.isPrimary ? (
                      <span className="font-semibold text-navy">Primary</span>
                    ) : (
                      `Sort ${image.sortOrder}`
                    )}
                  </span>
                  {canCreate && <DeleteImageForm imageId={image.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
        {canCreate && (
          <div className="border-t border-line p-4">
            <ImageForm productId={product.id} hasImages={images.length > 0} />
          </div>
        )}
      </section>
    </div>
  );
}