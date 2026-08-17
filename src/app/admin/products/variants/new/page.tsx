import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { VariantCreateForm } from "@/components/admin/variants/variant-forms";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { getProductsForSelect } from "@/lib/admin/variants";

export const metadata: Metadata = {
  title: "New Variant — Yemanuel Store Admin",
};

type SearchParams = Promise<{ product?: string }>;

export default async function AdminNewVariantPage({
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
  const products = await getProductsForSelect();

  return (
    <div className="space-y-4">
      <PageHeader title="New variant" description="Give a product a SKU, barcode and options." />
      <section className="rounded-lg border border-line bg-white p-5">
        <VariantCreateForm
          products={products}
          initialProductId={
            params.product && products.some((product) => product.id === params.product)
              ? params.product
              : undefined
          }
        />
      </section>
    </div>
  );
}