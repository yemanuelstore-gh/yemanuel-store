import { isServiceConfigured, createServiceClient } from "@/lib/supabase/service";

export type StoreContactInfo = {
  storeName: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  address: string | null;
  hours: string | null;
  stores: {
    name: string;
    city: string;
    region: string | null;
    addressLine1: string;
    addressLine2: string | null;
    phone: string | null;
  }[];
};

/**
 * Store contact details for the public contact page.
 *
 * Reads the store's configured contact settings and active store locations.
 * The settings table is staff-only under RLS, so this guest-visible read goes
 * through the service-role client (server-only, like order receipts and
 * tracking). Returns null values when a channel is not configured yet —
 * nothing is fabricated.
 */
export async function getStoreContactInfo(): Promise<StoreContactInfo> {
  const fallback: StoreContactInfo = {
    storeName: null,
    phone: null,
    email: null,
    whatsapp: null,
    address: null,
    hours: null,
    stores: [],
  };

  if (!isServiceConfigured()) return fallback;
  const client = createServiceClient();

  const [settingsResult, storesResult] = await Promise.all([
    client
      .from("settings")
      .select("key, value")
      .is("location_id", null)
      .in("key", [
        "store_name",
        "store_phone",
        "store_email",
        "store_whatsapp",
        "store_address",
        "store_hours",
      ]),
    client
      .from("locations")
      .select(
        "name, city, address_line_1, address_line_2, phone, status, regions(name)",
      )
      .eq("location_type", "store")
      .eq("status", "active")
      .order("name"),
  ]);

  if (settingsResult.error) return fallback;

  const settings = new Map<string, string>();
  for (const row of (settingsResult.data ?? []) as unknown as {
    key: string;
    value: string;
  }[]) {
    settings.set(row.key, row.value.trim());
  }

  const stores = ((storesResult.data ?? []) as unknown as {
    name: string;
    city: string;
    address_line_1: string;
    address_line_2: string | null;
    phone: string | null;
    regions: { name: string } | null;
  }[]).map((row) => ({
    name: row.name,
    city: row.city,
    region: row.regions?.name ?? null,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    phone: row.phone,
  }));

  return {
    storeName: settings.get("store_name") ?? null,
    phone: settings.get("store_phone") ?? null,
    email: settings.get("store_email") ?? null,
    whatsapp: settings.get("store_whatsapp") ?? null,
    address: settings.get("store_address") ?? null,
    hours: settings.get("store_hours") ?? null,
    stores,
  };
}