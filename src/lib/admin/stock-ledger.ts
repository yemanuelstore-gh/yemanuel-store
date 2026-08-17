import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared inventory ledger helpers used by stock-affecting server actions
 * (transfers, adjustments, goods receipts, sales). Every quantity change to
 * an inventory item must be paired with an entry in the append-only
 * stock_movements journal so on-hand quantities remain explainable.
 */

export type MovementInput = {
  inventoryItemId: string;
  movementType: string;
  quantityChange: number;
  unitCost: number | null;
  sourceType: string;
  sourceId: string;
  note?: string | null;
  createdBy: string;
};

export async function recordStockMovement(
  client: SupabaseClient,
  movement: MovementInput,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await client.from("stock_movements").insert({
    inventory_item_id: movement.inventoryItemId,
    movement_type: movement.movementType,
    quantity_change: movement.quantityChange,
    unit_cost: movement.unitCost,
    source_type: movement.sourceType,
    source_id: movement.sourceId,
    note: movement.note ?? null,
    created_by: movement.createdBy,
  });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export type InventoryItemRow = {
  id: string;
  quantity_on_hand: number;
  average_cost: number | null;
  reorder_level: number | null;
  reorder_quantity: number | null;
};

export async function findOrCreateInventoryItem(
  client: SupabaseClient,
  locationId: string,
  variantId: string,
): Promise<{ item: InventoryItemRow | null; error?: string }> {
  const { data, error } = await client
    .from("inventory_items")
    .select("id, quantity_on_hand, average_cost, reorder_level, reorder_quantity")
    .eq("location_id", locationId)
    .eq("variant_id", variantId)
    .maybeSingle();

  if (error) return { item: null, error: error.message };
  if (data) return { item: data as InventoryItemRow };

  const { data: created, error: insertError } = await client
    .from("inventory_items")
    .insert({
      location_id: locationId,
      variant_id: variantId,
      quantity_on_hand: 0,
      reserved_quantity: 0,
      average_cost: 0,
    })
    .select("id, quantity_on_hand, average_cost, reorder_level, reorder_quantity")
    .single();

  if (insertError) return { item: null, error: insertError.message };
  return { item: created as InventoryItemRow };
}

/**
 * Adjust an inventory item's quantity by delta. When delta is negative the
 * update is conditional on the resulting balance staying at or above zero,
 * so overselling/adjusting below zero is rejected.
 */
export async function applyQuantityDelta(
  client: SupabaseClient,
  itemId: string,
  delta: number,
): Promise<{ ok: boolean; error?: string }> {
  if (delta === 0) return { ok: true };

  const { data: current, error: readError } = await client
    .from("inventory_items")
    .select("quantity_on_hand")
    .eq("id", itemId)
    .single();
  if (readError || !current) {
    return { ok: false, error: "Inventory record not found." };
  }

  const target = Number(current.quantity_on_hand) + delta;
  if (target < 0) {
    return { ok: false, error: "Not enough stock — the change would take the balance below zero." };
  }

  const { error } = await client
    .from("inventory_items")
    .update({ quantity_on_hand: target })
    .eq("id", itemId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function weightedAverageCost(
  currentQuantity: number,
  currentCost: number,
  deltaQuantity: number,
  unitCost: number,
): number {
  const total = currentQuantity + deltaQuantity;
  if (total <= 0) return unitCost;
  const weighted = (currentQuantity * currentCost + deltaQuantity * unitCost) / total;
  return Math.round(weighted * 100) / 100;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}