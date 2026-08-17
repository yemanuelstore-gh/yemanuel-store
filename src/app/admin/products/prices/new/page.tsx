import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { PriceCreateForm } from "@/components/admin/prices/price-forms";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import {
  getPriceLocations,
  getProductsForSelect,
  getVariantSelectOptions,
} from "@/lib/admin/variants";

export const metadata: Metadata = {
  title: "New Price — Yemanuel Store Admin",
};

type SearchParams = Promise<{ product?: string; variant?: string }>;

export default async function AdminNewPricePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.create)) {
    return (
      <UnauthorizedPage message="Your account does not have the products.create permission." />
    );
  }

  const params = await searchParams;
  const [products, variants, locations] = await Promise.all([
    getProductsForSelect(),
    getVariantSelectOptions(),
    getPriceLocations(),
  ]);

  const initialProductId =
    params.product && products.some((product) => product.id === params.product)
      ? params.product
      : undefined;
  const initialVariantId =
    params.variant &&
    variants.some((variant) => variant.id === params.variant)
      ? params.variant
      : undefined;

  return (
    <div className="space-y-4">
      <PageHeader
        title="New price"
        description="Selling or sale price, per product or per variant, optionally per location."
      />
      <section className="rounded-lg border border-line bg-white p-5">
        <PriceCreateForm
          products={products}
          variants={variants}
          locations={locations}
          initialProductId={initialProductId}
          initialVariantId={initialVariantId}
        />
      </section>
    </div>
  );
}