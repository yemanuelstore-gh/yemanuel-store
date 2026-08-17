import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { VariantEditForm } from "@/components/admin/variants/variant-forms";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { getVariantById } from "@/lib/admin/variants";

export const metadata: Metadata = {
  title: "Edit Variant — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditVariantPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.update)) {
    return (
      <UnauthorizedPage message="Your account does not have the products.update permission." />
    );
  }

  const { id } = await params;
  const variant = await getVariantById(id);
  if (!variant) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit variant"
        description={`${variant.productName} · ${variant.name}`}
      />
      <section className="rounded-lg border border-line bg-white p-5">
        <VariantEditForm
          productName={variant.productName}
          variant={{
            id: variant.id,
            name: variant.name,
            sku: variant.sku,
            barcode: variant.barcode,
            options: variant.options,
            status: variant.status,
          }}
        />
      </section>
    </div>
  );
}