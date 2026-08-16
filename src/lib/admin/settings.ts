import { createClient } from "@/lib/supabase/server";

export type LocationRow = {
  id: string;
  code: string;
  name: string;
  locationType: string;
  regionName: string | null;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  phone: string | null;
  status: string;
};

export async function getLocations(): Promise<LocationRow[]> {
  const client = await createClient();
  const { data } = await client
    .from("locations")
    .select("id, code, name, location_type, city, address_line_1, address_line_2, phone, status, regions(name)")
    .order("name");

  const rows = (data ?? []) as unknown as {
    id: string;
    code: string;
    name: string;
    location_type: string;
    city: string;
    address_line_1: string;
    address_line_2: string | null;
    phone: string | null;
    status: string;
    regions: { name: string } | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    locationType: row.location_type,
    regionName: row.regions?.name ?? null,
    city: row.city,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    phone: row.phone,
    status: row.status,
  }));
}

export type DeliveryMethodRow = {
  id: string;
  code: string;
  name: string;
  kind: string;
  fee: number | null;
  isActive: boolean;
  sortOrder: number;
};

export async function getDeliveryMethods(): Promise<DeliveryMethodRow[]> {
  const client = await createClient();
  const { data } = await client
    .from("delivery_methods")
    .select("id, code, name, kind, fee, is_active, sort_order")
    .order("sort_order");

  const rows = (data ?? []) as unknown as {
    id: string;
    code: string;
    name: string;
    kind: string;
    fee: number | null;
    is_active: boolean;
    sort_order: number;
  }[];

  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    kind: row.kind,
    fee: row.fee !== null ? Number(row.fee) : null,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  }));
}

export type RegionRow = {
  id: string;
  code: string;
  name: string;
};

export async function getRegions(): Promise<RegionRow[]> {
  const client = await createClient();
  const { data } = await client
    .from("regions")
    .select("id, code, name")
    .order("name");

  const rows = (data ?? []) as unknown as { id: string; code: string; name: string }[];
  return rows.map((row) => ({ id: row.id, code: row.code, name: row.name }));
}

export type DeliveryRateRow = {
  id: string;
  deliveryMethodId: string;
  deliveryMethodName: string;
  deliveryMethodKind: string;
  regionId: string;
  regionName: string;
  fee: number;
  etaMinDays: number;
  etaMaxDays: number;
  isActive: boolean;
};

export async function getDeliveryRates(): Promise<DeliveryRateRow[]> {
  const client = await createClient();
  const { data } = await client
    .from("delivery_rates")
    .select(
      "id, fee, eta_min_days, eta_max_days, is_active, delivery_method_id, region_id, delivery_methods(name, kind), regions(name)",
    )
    .order("delivery_method_id")
    .order("region_id");

  const rows = (data ?? []) as unknown as {
    id: string;
    fee: number;
    eta_min_days: number;
    eta_max_days: number;
    is_active: boolean;
    delivery_method_id: string;
    region_id: string;
    delivery_methods: { name: string; kind: string } | null;
    regions: { name: string } | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    deliveryMethodId: row.delivery_method_id,
    deliveryMethodName: row.delivery_methods?.name ?? "",
    deliveryMethodKind: row.delivery_methods?.kind ?? "delivery",
    regionId: row.region_id,
    regionName: row.regions?.name ?? "",
    fee: Number(row.fee),
    etaMinDays: Number(row.eta_min_days),
    etaMaxDays: Number(row.eta_max_days),
    isActive: row.is_active,
  }));
}

export type SettingRow = {
  id: string;
  key: string;
  value: string;
  description: string | null;
  isSystem: boolean;
};

export async function getSettings(): Promise<SettingRow[]> {
  const client = await createClient();
  const { data } = await client
    .from("settings")
    .select("id, key, value, description, is_system")
    .is("location_id", null)
    .order("key");

  const rows = (data ?? []) as unknown as {
    id: string;
    key: string;
    value: string;
    description: string | null;
    is_system: boolean;
  }[];

  return rows.map((row) => ({
    id: row.id,
    key: row.key,
    value: row.value,
    description: row.description,
    isSystem: row.is_system,
  }));
}