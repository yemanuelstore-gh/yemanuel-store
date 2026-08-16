import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-forms";
import { PageHeader } from "@/components/admin/ui";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { getBrandsForSelect, getCategoriesForSelect } from "@/lib/admin/products";
import { UnauthorizedPage } from "@/components/admin/unauthorized";

export const metadata: Metadata = {
  title: "New Product — Yemanuel Store Admin",
};

export default async function NewProductPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.create)) {
    return (
      <UnauthorizedPage
        title="Cannot create products"
        message="Your account does not have the products.create permission."
      />
    );
  }

  const [categories, brands] = await Promise.all([
    getCategoriesForSelect(),
    getBrandsForSelect(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="New product"
        description="Create a product, then add variants, prices and images."
      />
      <div className="rounded-lg border border-line bg-white p-5">
        <ProductForm action="create" categories={categories} brands={brands} />
      </div>
    </div>
  );
}