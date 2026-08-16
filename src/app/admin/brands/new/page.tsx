import type { Metadata } from "next";
import { BrandForm } from "@/components/admin/catalogue-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "New Brand — Yemanuel Store Admin",
};

export default async function NewBrandPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.create)) {
    return (
      <UnauthorizedPage
        title="Cannot create brands"
        message="Your account does not have the products.create permission."
      />
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="New brand" description="Add a brand to the catalogue." />
      <div className="rounded-lg border border-line bg-white p-5">
        <BrandForm action="create" />
      </div>
    </div>
  );
}