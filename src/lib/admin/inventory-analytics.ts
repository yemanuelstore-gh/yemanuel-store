import { createClient } from "@/lib/supabase/server";

/**
 * Server-side data access for the Warehouses / Locations, Low Stock and
 * Stock Valuation modules. All reads go through the authenticated client so
 * RLS (inventory.read) applies, and every query aggregates inside PostgreSQL
 * (app.* functions) to stay clear of the PostgREST 1,000-row cap.
 *
 * Definitions (shared across the modules):
 *   available       = quantity_on_hand - reserved_quantity
 *   out of stock    = available <= 0
 *   low stock       = available > 0 AND reorder_level IS NOT NULL
 *                     AND available <= reorder_level
 *   affected        = out of stock OR low stock
 *   shortage        = max(reorder_level - available, 0)
 *   inventory value = quantity_on_hand * average_cost
 */

export type LocationInventorySummary = {
  id: string;
  name: string;
  code: string;
  locationType: string;
  status: string;
  regionName: string | null;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  phone: string | null;
  skuCount: number;
  units: number;
  inventoryValue: number;
  lowStockCount: number;
  outOfStockCount: number;
};

export async function getLocationsSummary(q?: string): Promise<LocationInventorySummary[]> {
  const client = await createClient();
  const { data, error } = await client.schema("app").rpc("inventory_locations_summary", {
    p_q: q?.trim() || null,
  });
  if (error) {
    console.error("[inventory-analytics] inventory_locations_summary failed:", error);
    return [];
  }
  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    code: string;
    location_type: string;
    status: string;
    region_name: string | null;
    city: string;
    address_line_1: string;
    address_line_2: string | null;
    phone: string | null;
    sku_count: number;
    units: number;
    inventory_value: number;
    low_stock_count: number;
    out_of_stock_count: number;
  }[];
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    locationType: row.location_type,
    status: row.status,
    regionName: row.region_name,
    city: row.city,
    addressLine1: row.address_line_1,
    addressLine2: row.address_line_2,
    phone: row.phone,
    skuCount: Number(row.sku_count),
    units: Number(row.units),
    inventoryValue: Number(row.inventory_value),
    lowStockCount: Number(row.low_stock_count),
    outOfStockCount: Number(row.out_of_stock_count),
  }));
}

export type LowStockSummary = {
  outOfStockCount: number;
  lowStockCount: number;
  affectedSkus: number;
  atRiskValue: number;
};

export async function getLowStockSummary(locationId?: string): Promise<LowStockSummary | null> {
  const client = await createClient();
  const { data, error } = await client.schema("app").rpc("inventory_low_stock_summary", {
    p_location_id: locationId || null,
  });
  if (error) {
    console.error("[inventory-analytics] inventory_low_stock_summary failed:", error);
    return null;
  }
  const row = (data ?? null) as {
    out_of_stock_count: number;
    low_stock_count: number;
    affected_skus: number;
    at_risk_value: number;
  } | null;
  if (!row) return null;
  return {
    outOfStockCount: Number(row.out_of_stock_count),
    lowStockCount: Number(row.low_stock_count),
    affectedSkus: Number(row.affected_skus),
    atRiskValue: Number(row.at_risk_value),
  };
}

export type LowStockRow = {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  locationId: string;
  locationName: string;
  quantityOnHand: number;
  reservedQuantity: number;
  available: number;
  reorderLevel: number | null;
  averageCost: number;
  inventoryValue: number;
  shortage: number;
};

export type LowStockStatusFilter = "all" | "out" | "low";
export type LowStockSort = "available" | "shortage" | "value" | "name";

export async function getLowStockSkus({
  locationId,
  q,
  categoryId,
  status,
  sort,
  page = 1,
  pageSize = 25,
}: {
  locationId?: string;
  q?: string;
  categoryId?: string;
  status?: LowStockStatusFilter;
  sort?: LowStockSort;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: LowStockRow[]; total: number }> {
  const client = await createClient();
  const { data, error } = await client.schema("app").rpc("inventory_low_stock_skus", {
    p_location_id: locationId || null,
    p_q: q?.trim() || null,
    p_category_id: categoryId || null,
    p_status: status ?? "all",
    p_sort: sort ?? "available",
    p_page: Math.max(1, page),
    p_page_size: Math.max(1, pageSize),
  });
  if (error) {
    console.error("[inventory-analytics] inventory_low_stock_skus failed:", error);
    return { rows: [], total: 0 };
  }
  const payload = (data ?? null) as {
    total: number;
    rows: {
      id: string;
      product_id: string;
      product_name: string;
      variant_name: string;
      sku: string;
      barcode: string | null;
      location_id: string;
      location_name: string;
      quantity_on_hand: number;
      reserved_quantity: number;
      available: number;
      reorder_level: number | null;
      average_cost: number;
      inventory_value: number;
      shortage: number;
    }[];
  } | null;
  if (!payload) return { rows: [], total: 0 };
  return {
    rows: (payload.rows ?? []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      variantName: row.variant_name,
      sku: row.sku,
      barcode: row.barcode,
      locationId: row.location_id,
      locationName: row.location_name,
      quantityOnHand: Number(row.quantity_on_hand),
      reservedQuantity: Number(row.reserved_quantity),
      available: Number(row.available),
      reorderLevel: row.reorder_level === null ? null : Number(row.reorder_level),
      averageCost: Number(row.average_cost),
      inventoryValue: Number(row.inventory_value),
      shortage: Number(row.shortage),
    })),
    total: Number(payload.total ?? 0),
  };
}

export type ValuationLocationBreakdown = {
  locationId: string;
  locationName: string;
  value: number;
  units: number;
  itemCount: number;
};

export type ValuationCategoryBreakdown = {
  categoryName: string;
  value: number;
  units: number;
  itemCount: number;
};

export type ValuationSummary = {
  totalValue: number;
  totalUnits: number;
  skuCount: number;
  locationCount: number;
  lowStockValue: number;
  byLocation: ValuationLocationBreakdown[];
  byCategory: ValuationCategoryBreakdown[];
};

export async function getValuationSummary(
  locationId?: string,
  categoryId?: string,
): Promise<ValuationSummary | null> {
  const client = await createClient();
  const { data, error } = await client.schema("app").rpc("inventory_valuation_summary", {
    p_location_id: locationId || null,
    p_category_id: categoryId || null,
  });
  if (error) {
    console.error("[inventory-analytics] inventory_valuation_summary failed:", error);
    return null;
  }
  const payload = (data ?? null) as {
    total_value: number;
    total_units: number;
    sku_count: number;
    location_count: number;
    low_stock_value: number;
    by_location: {
      location_id: string;
      location_name: string;
      value: number;
      units: number;
      item_count: number;
    }[];
    by_category: {
      category_name: string;
      value: number;
      units: number;
      item_count: number;
    }[];
  } | null;
  if (!payload) return null;
  return {
    totalValue: Number(payload.total_value),
    totalUnits: Number(payload.total_units),
    skuCount: Number(payload.sku_count),
    locationCount: Number(payload.location_count),
    lowStockValue: Number(payload.low_stock_value),
    byLocation: (payload.by_location ?? []).map((row) => ({
      locationId: row.location_id,
      locationName: row.location_name,
      value: Number(row.value),
      units: Number(row.units),
      itemCount: Number(row.item_count),
    })),
    byCategory: (payload.by_category ?? []).map((row) => ({
      categoryName: row.category_name,
      value: Number(row.value),
      units: Number(row.units),
      itemCount: Number(row.item_count),
    })),
  };
}

export type ValuationRow = {
  id: string;
  productId: string;
  productName: string;
  variantName: string;
  sku: string;
  barcode: string | null;
  locationId: string;
  locationName: string;
  quantityOnHand: number;
  reservedQuantity: number;
  available: number;
  reorderLevel: number | null;
  averageCost: number;
  inventoryValue: number;
};

export type ValuationSort = "name" | "value" | "units";

export async function getValuationRows({
  locationId,
  categoryId,
  productId,
  q,
  status,
  sort,
  page = 1,
  pageSize = 25,
}: {
  locationId?: string;
  categoryId?: string;
  productId?: string;
  q?: string;
  status?: LowStockStatusFilter;
  sort?: ValuationSort;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: ValuationRow[]; total: number }> {
  const client = await createClient();
  const { data, error } = await client.schema("app").rpc("inventory_valuation_rows", {
    p_location_id: locationId || null,
    p_category_id: categoryId || null,
    p_product_id: productId || null,
    p_q: q?.trim() || null,
    p_status: status ?? "all",
    p_sort: sort ?? "name",
    p_page: Math.max(1, page),
    p_page_size: Math.max(1, pageSize),
  });
  if (error) {
    console.error("[inventory-analytics] inventory_valuation_rows failed:", error);
    return { rows: [], total: 0 };
  }
  const payload = (data ?? null) as {
    total: number;
    rows: {
      id: string;
      product_id: string;
      product_name: string;
      variant_name: string;
      sku: string;
      barcode: string | null;
      location_id: string;
      location_name: string;
      quantity_on_hand: number;
      reserved_quantity: number;
      available: number;
      reorder_level: number | null;
      average_cost: number;
      inventory_value: number;
    }[];
  } | null;
  if (!payload) return { rows: [], total: 0 };
  return {
    rows: (payload.rows ?? []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      productName: row.product_name,
      variantName: row.variant_name,
      sku: row.sku,
      barcode: row.barcode,
      locationId: row.location_id,
      locationName: row.location_name,
      quantityOnHand: Number(row.quantity_on_hand),
      reservedQuantity: Number(row.reserved_quantity),
      available: Number(row.available),
      reorderLevel: row.reorder_level === null ? null : Number(row.reorder_level),
      averageCost: Number(row.average_cost),
      inventoryValue: Number(row.inventory_value),
    })),
    total: Number(payload.total ?? 0),
  };
}

export type StockStatus = "out" | "low" | "healthy";

export function stockStatusFor(
  available: number,
  reorderLevel: number | null,
): StockStatus {
  if (available <= 0) return "out";
  if (reorderLevel !== null && available <= reorderLevel) return "low";
  return "healthy";
}