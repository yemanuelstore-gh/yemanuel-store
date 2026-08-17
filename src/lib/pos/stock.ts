import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * POS-specific atomic stock deduction.
 *
 * Deliberately NOT `applyQuantityDelta()` from lib/admin/stock-ledger.ts:
 * that helper reads then writes unconditionally, which is unsafe for two
 * registers completing sales at the same time (lost updates, overselling).
 *
 * This helper uses a compare-and-swap loop: it reads the current balance,
 * then updates `quantity_on_hand` only when the balance still equals the
 * value it just read. A concurrent change makes the update match zero rows
 * and the loop retries with a fresh read. Combined with the `>= quantity`
 * pre-check this can never take a balance below zero.
 */

export type StockDeductResult =
  | { ok: true }
  | {
      ok: false;
      code: "missing" | "insufficient" | "concurrent" | "error";
      message: string;
    };

const MAX_ATTEMPTS = 3;

export async function atomicallyDeductStock(
  client: SupabaseClient,
  itemId: string,
  quantity: number,
): Promise<StockDeductResult> {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { ok: true };
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const { data: current, error: readError } = await client
      .from("inventory_items")
      .select("id, quantity_on_hand")
      .eq("id", itemId)
      .maybeSingle();

    if (readError || !current) {
      return {
        ok: false,
        code: "missing",
        message: "The stock record for an item in this sale no longer exists.",
      };
    }

    const onHand = Number(current.quantity_on_hand);
    if (onHand + 1e-9 < quantity) {
      return {
        ok: false,
        code: "insufficient",
        message: `Not enough stock — only ${onHand} available for this item.`,
      };
    }

    const target = Math.round((onHand - quantity) * 1000) / 1000;
    const { data: updated, error: updateError } = await client
      .from("inventory_items")
      .update({ quantity_on_hand: target })
      .eq("id", itemId)
      .eq("quantity_on_hand", onHand)
      .select("id");

    if (updateError) {
      return {
        ok: false,
        code: "error",
        message: "Could not update stock for this sale.",
      };
    }
    if (updated && updated.length === 1) {
      return { ok: true };
    }
    // Balance changed between the read and the update — retry with a fresh read.
  }

  return {
    ok: false,
    code: "concurrent",
    message:
      "Stock changed while this sale was being processed. Please review the sale and try again.",
  };
}

/**
 * Best-effort compensation used to undo already-deducted lines when a later
 * step of a sale fails. Only ever called with quantities this sale deducted.
 */
export async function restoreStock(
  client: SupabaseClient,
  itemId: string,
  quantity: number,
): Promise<boolean> {
  if (!Number.isFinite(quantity) || quantity <= 0) return true;
  const { data: current } = await client
    .from("inventory_items")
    .select("quantity_on_hand")
    .eq("id", itemId)
    .maybeSingle();
  if (!current) return false;
  const target = Math.round((Number(current.quantity_on_hand) + quantity) * 1000) / 1000;
  const { error } = await client
    .from("inventory_items")
    .update({ quantity_on_hand: target })
    .eq("id", itemId);
  return !error;
}