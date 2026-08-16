import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryForm } from "@/components/admin/catalogue-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getAllCategories, getCategoryById } from "@/lib/admin/catalogue-admin";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Edit Category — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCategoryPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.update)) {
    return (
      <UnauthorizedPage
        title="Cannot edit categories"
        message="Your account does not have the products.update permission."
      />
    );
  }

  const { id } = await params;
  const [category, allCategories] = await Promise.all([getCategoryById(id), getAllCategories()]);
  if (!category) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit category: ${category.name}`}
        description="Update the name, hierarchy or display settings."
      />
      <div className="rounded-lg border border-line bg-white p-5">
        <CategoryForm
          action="update"
          categories={allCategories}
          initial={{
            id: category.id,
            name: category.name,
            slug: category.slug,
            parentId: category.parent_id,
            description: category.description,
            imageUrl: category.image_url,
            sortOrder: category.sort_order,
            status: category.status,
          }}
        />
      </div>
    </div>
  );
}