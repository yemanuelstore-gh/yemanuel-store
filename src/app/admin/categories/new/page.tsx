import type { Metadata } from "next";
import { CategoryForm } from "@/components/admin/catalogue-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getAllCategories } from "@/lib/admin/catalogue-admin";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "New Category — Yemanuel Store Admin",
};

export default async function NewCategoryPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.create)) {
    return (
      <UnauthorizedPage
        title="Cannot create categories"
        message="Your account does not have the products.create permission."
      />
    );
  }

  const categories = await getAllCategories();

  return (
    <div className="space-y-4">
      <PageHeader title="New category" description="Add a category to the catalogue." />
      <div className="rounded-lg border border-line bg-white p-5">
        <CategoryForm action="create" categories={categories} />
      </div>
    </div>
  );
}