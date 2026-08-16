import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type InventoryItem = {
  id: string;
  productId: string;
  locationName: string;
  productName: string;
  variantName: string;
  sku: string;
  quantityOnHand: number;
  reservedQuantity: number;
  available: number;
  averageCost: number;
  reorderLevel: number | null;
  reorderQuantity: number | null;
};

export async function getInventory({
  q,
  locationId,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  locationId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ items: InventoryItem[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("inventory_items")
    .select(
      "id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity, product_variants(product_id, name, sku, products(name)), locations(name)",
      { count: "exact" },
    );

  if (locationId) {
    query = query.eq("location_id", locationId);
  }
  if (q && q.trim() !== "") {
    const term = `%${q.trim()}%`;
    query = query.or(`product_variants.sku.ilike.${term},product_variants.name.ilike.${term}`);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    quantity_on_hand: number;
    reserved_quantity: number;
    average_cost: number;
    reorder_level: number | null;
    reorder_quantity: number | null;
    product_variants: {
      product_id: string;
      name: string;
      sku: string;
      products: { name: string } | null;
    } | null;
    locations: { name: string } | null;
  }[];

  return {
    items: rows.map((row) => ({
      id: row.id,
      productId: row.product_variants?.product_id ?? "",
      locationName: row.locations?.name ?? "—",
      productName: row.product_variants?.products?.name ?? "—",
      variantName: row.product_variants?.name ?? "—",
      sku: row.product_variants?.sku ?? "—",
      quantityOnHand: Number(row.quantity_on_hand),
      reservedQuantity: Number(row.reserved_quantity),
      available: Number(row.quantity_on_hand) - Number(row.reserved_quantity),
      averageCost: Number(row.average_cost),
      reorderLevel: row.reorder_level === null ? null : Number(row.reorder_level),
      reorderQuantity:
        row.reorder_quantity === null ? null : Number(row.reorder_quantity),
    })),
    total: count ?? 0,
  };
}

export type StockMovement = {
  id: string;
  movementType: string;
  quantityChange: number;
  unitCost: number | null;
  sourceType: string;
  sourceId: string;
  note: string | null;
  createdAt: string;
  createdBy: string;
  variantName: string;
  sku: string;
  locationName: string;
};

export async function getStockMovements({
  page = 1,
  pageSize = 50,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{ movements: StockMovement[]; total: number }> {
  const client = await createClient();
  const { data, count } = await client
    .from("stock_movements")
    .select(
      "id, movement_type, quantity_change, unit_cost, source_type, source_id, note, created_at, created_by, inventory_items(variant_id, product_variants(name, sku), locations(name))",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    movement_type: string;
    quantity_change: number;
    unit_cost: number | null;
    source_type: string;
    source_id: string;
    note: string | null;
    created_at: string;
    created_by: string;
    inventory_items: {
      product_variants: { name: string; sku: string } | null;
      locations: { name: string } | null;
    } | null;
  }[];

  return {
    movements: rows.map((row) => ({
      id: row.id,
      movementType: row.movement_type,
      quantityChange: Number(row.quantity_change),
      unitCost: row.unit_cost === null ? null : Number(row.unit_cost),
      sourceType: row.source_type,
      sourceId: row.source_id,
      note: row.note,
      createdAt: row.created_at,
      createdBy: row.created_by,
      variantName: row.inventory_items?.product_variants?.name ?? "—",
      sku: row.inventory_items?.product_variants?.sku ?? "—",
      locationName: row.inventory_items?.locations?.name ?? "—",
    })),
    total: count ?? 0,
  };
}

export async function getActorNames(userIds: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  const names = new Map<string, string>();
  if (unique.length === 0) return names;
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("profiles")
      .select("id, full_name")
      .in("id", unique);
    for (const row of data ?? []) {
      names.set(row.id, row.full_name);
    }
  } catch {
    // Attribution is best-effort; ids are shown as fallback.
  }
  return names;
}

export async function getTransfers({
  page = 1,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{
  transfers: {
    id: string;
    transferNumber: string;
    fromLocation: string;
    toLocation: string;
    status: string;
    createdAt: string;
    itemCount: number;
  }[];
  total: number;
}> {
  const client = await createClient();
  const { data, count } = await client
    .from("stock_transfers")
    .select(
      "id, transfer_number, status, created_at, from_location_id, to_location_id, stock_transfer_items(quantity), from_locations:stock_transfers_from_location_id_fkey(name), to_locations:stock_transfers_to_location_id_fkey(name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    transfer_number: string;
    status: string;
    created_at: string;
    stock_transfer_items: { quantity: number }[];
    from_locations: { name: string } | null;
    to_locations: { name: string } | null;
  }[];

  return {
    transfers: rows.map((row) => ({
      id: row.id,
      transferNumber: row.transfer_number,
      fromLocation: row.from_locations?.name ?? "—",
      toLocation: row.to_locations?.name ?? "—",
      status: row.status,
      createdAt: row.created_at,
      itemCount: (row.stock_transfer_items ?? []).reduce(
        (sum, item) => sum + Number(item.quantity),
        0,
      ),
    })),
    total: count ?? 0,
  };
}

export async function getTransferById(id: string) {
  const client = await createClient();
  const { data, error } = await client
    .from("stock_transfers")
    .select(
      "id, transfer_number, status, notes, created_at, created_by, stock_transfer_items(id, variant_id, quantity, status, product_variants(name, sku)), from_locations:stock_transfers_from_location_id_fkey(id, name), to_locations:stock_transfers_to_location_id_fkey(id, name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as {
    id: string;
    transfer_number: string;
    status: string;
    notes: string | null;
    created_at: string;
    created_by: string;
    stock_transfer_items: {
      id: string;
      variant_id: string;
      quantity: number;
      status: string;
      product_variants: { name: string; sku: string } | null;
    }[];
    from_locations: { id: string; name: string } | null;
    to_locations: { id: string; name: string } | null;
  };
}

export async function getAdjustments({
  page = 1,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{
  adjustments: {
    id: string;
    adjustmentNumber: string;
    reason: string;
    status: string;
    createdAt: string;
    itemCount: number;
  }[];
  total: number;
}> {
  const client = await createClient();
  const { data, count } = await client
    .from("stock_adjustments")
    .select(
      "id, adjustment_number, reason, status, created_at, stock_adjustment_items(quantity_change)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    adjustment_number: string;
    reason: string;
    status: string;
    created_at: string;
    stock_adjustment_items: { quantity_change: number }[];
  }[];

  return {
    adjustments: rows.map((row) => ({
      id: row.id,
      adjustmentNumber: row.adjustment_number,
      reason: row.reason,
      status: row.status,
      createdAt: row.created_at,
      itemCount: (row.stock_adjustment_items ?? []).length,
    })),
    total: count ?? 0,
  };
}

export async function getAdjustmentById(id: string) {
  const client = await createClient();
  const { data, error } = await client
    .from("stock_adjustments")
    .select(
      "id, adjustment_number, reason, status, created_at, created_by, stock_adjustment_items(id, inventory_item_id, reason, quantity_change, inventory_items(location_id, quantity_on_hand, product_variants(name, sku), locations(name)))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as {
    id: string;
    adjustment_number: string;
    reason: string;
    status: string;
    created_at: string;
    created_by: string;
    stock_adjustment_items: {
      id: string;
      inventory_item_id: string;
      reason: string;
      quantity_change: number;
      inventory_items: {
        location_id: string;
        quantity_on_hand: number;
        product_variants: { name: string; sku: string } | null;
        locations: { name: string } | null;
      } | null;
    }[];
  };
}

export async function getLocations() {
  const client = await createClient();
  const { data } = await client
    .from("locations")
    .select("id, name, code, location_type, status")
    .order("name", { ascending: true });
  return (data ?? []) as unknown as {
    id: string;
    name: string;
    code: string;
    location_type: string;
    status: string;
  }[];
}

export async function getInventoryItemsForSelect() {
  const client = await createClient();
  const { data } = await client
    .from("inventory_items")
    .select(
      "id, location_id, quantity_on_hand, product_variants(id, name, sku), locations(name)",
    )
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as unknown as {
    id: string;
    location_id: string;
    quantity_on_hand: number;
    product_variants: { id: string; name: string; sku: string } | null;
    locations: { name: string } | null;
  }[];
}

export async function getVariantsForSelect() {
  const client = await createClient();
  const { data } = await client
    .from("product_variants")
    .select("id, name, sku, products(name)")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(500);
  return (data ?? []) as unknown as {
    id: string;
    name: string;
    sku: string;
    products: { name: string } | null;
  }[];
}