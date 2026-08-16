import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BrandForm } from "@/components/admin/catalogue-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getBrandById } from "@/lib/admin/catalogue-admin";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Edit Brand — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditBrandPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.update)) {
    return (
      <UnauthorizedPage
        title="Cannot edit brands"
        message="Your account does not have the products.update permission."
      />
    );
  }

  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Edit brand: ${brand.name}`}
        description="Update the brand name, slug or status."
      />
      <div className="rounded-lg border border-line bg-white p-5">
        <BrandForm
          action="update"
          initial={{
            id: brand.id,
            name: brand.name,
            slug: brand.slug,
            description: brand.description,
            status: brand.status,
          }}
        />
      </div>
    </div>
  );
}