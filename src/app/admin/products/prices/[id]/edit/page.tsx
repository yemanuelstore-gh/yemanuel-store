import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { PriceEditForm } from "@/components/admin/prices/price-forms";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { statusLabel } from "@/lib/admin/labels";
import { getPriceById, getPriceLocations } from "@/lib/admin/variants";

export const metadata: Metadata = {
  title: "Edit Price — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditPricePage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.products.update)) {
    return (
      <UnauthorizedPage message="Your account does not have the products.update permission." />
    );
  }

  const { id } = await params;
  const [price, locations] = await Promise.all([getPriceById(id), getPriceLocations()]);
  if (!price) notFound();

  const targetLabel = price.variantId
    ? `${price.productName} · ${price.variantName ?? "Variant"} (${price.sku ?? "no SKU"})`
    : `${price.productName} · All variants`;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit price"
        description={`${targetLabel} · ${statusLabel(price.priceType)} price`}
      />
      <section className="rounded-lg border border-line bg-white p-5">
        <PriceEditForm price={price} targetLabel={targetLabel} locations={locations} />
      </section>
    </div>
  );
}