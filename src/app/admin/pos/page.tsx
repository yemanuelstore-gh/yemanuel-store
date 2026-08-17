import type { Metadata } from "next";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { AdminEmptyState } from "@/components/admin/ui";
import {
  getPosLocations,
  getPosCategories,
  getPosCatalogueSeed,
} from "@/lib/pos/catalogue";
import { isServiceConfigured } from "@/lib/supabase/service";
import { PosRegister } from "@/components/admin/pos/pos-register";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Point of Sale — Yemanuel Store",
};

export default async function PosPage() {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.read)) {
    return <UnauthorizedPage />;
  }

  if (!isServiceConfigured()) {
    return (
      <AdminEmptyState
        title="Sales are unavailable"
        message="The store service is not configured. Contact an administrator."
      />
    );
  }

  const [locations, categories, seed] = await Promise.all([
    getPosLocations(),
    getPosCategories(),
    getPosCatalogueSeed(null),
  ]);

  const defaultLocation = locations[0] ?? null;
  const seededItems =
    defaultLocation === null
      ? seed
      : await getPosCatalogueSeed(defaultLocation.id);

  return (
    <PosRegister
      initialItems={seededItems}
      categories={categories}
      locations={locations}
      initialLocationId={defaultLocation?.id ?? null}
      canCompleteSale={hasPermission(session, PERMISSIONS.sales.create)}
      canCreateCustomer={hasPermission(session, PERMISSIONS.customers.create)}
    />
  );
}