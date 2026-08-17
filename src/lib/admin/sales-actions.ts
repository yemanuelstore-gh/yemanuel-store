"use server";

import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { applyQuantityDelta, recordStockMovement } from "@/lib/admin/stock-ledger";
import { createClient } from "@/lib/supabase/server";

const VALID_ORDER_STATUS = [
  "confirmed",
  "processing",
  "ready_for_delivery",
  "out_for_delivery",
  "shipped",
  "delivered",
  "cancelled",
];
const VALID_PAYMENT_STATUS = [
  "unpaid",
  "partially_paid",
  "paid",
  "refunded",
  "partially_refunded",
];
const VALID_FULFILMENT_STATUS = ["unfulfilled", "partially_fulfilled", "fulfilled"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return fallback;
}

const STOCK_CONSUMED_STATUSES = [
  "processing",
  "ready_for_delivery",
  "out_for_delivery",
  "shipped",
  "delivered",
];

export async function updateOrderStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.update)) {
    return { ok: false, message: "You do not have permission to update orders." };
  }

  const orderId = formData.get("orderId");
  const field = formData.get("field");
  const value = formData.get("value");

  if (typeof orderId !== "string" || orderId === "") {
    return { ok: false, message: "Missing order." };
  }
  if (
    field !== "status" &&
    field !== "payment_status" &&
    field !== "fulfilment_status"
  ) {
    return { ok: false, message: "Invalid field." };
  }

  const valid =
    field === "status"
      ? VALID_ORDER_STATUS
      : field === "payment_status"
        ? VALID_PAYMENT_STATUS
        : VALID_FULFILMENT_STATUS;
  if (typeof value !== "string" || !valid.includes(value)) {
    return { ok: false, message: "Invalid value for the selected field." };
  }

  const client = await createClient();

  if (field === "status") {
    const { data: order, error: orderError } = await client
      .from("orders")
      .select("id, order_number, status, location_id")
      .eq("id", orderId)
      .maybeSingle();
    if (orderError || !order) {
      return { ok: false, message: "Order not found." };
    }

    const consumingStock = STOCK_CONSUMED_STATUSES.includes(order.status);
    const willConsume = value === "processing" && !consumingStock;
    const willRestock = value === "cancelled" && consumingStock;

    if (willConsume || willRestock) {
      const { data: items, error: itemsError } = await client
        .from("order_items")
        .select("id, variant_id, quantity, unit_cost")
        .eq("order_id", orderId);
      if (itemsError) {
        return { ok: false, message: message(itemsError, "Could not load order items.") };
      }
      if ((items ?? []).length === 0) {
        return { ok: false, message: "This order has no items to move stock for." };
      }

      const direction = willConsume ? -1 : 1;
      for (const item of items ?? []) {
        const { data: inventory } = await client
          .from("inventory_items")
          .select("id, quantity_on_hand, average_cost")
          .eq("location_id", order.location_id)
          .eq("variant_id", item.variant_id)
          .maybeSingle();
        if (!inventory) {
          return {
            ok: false,
            message: `No stock record exists for ${item.variant_id} at the order location.`,
          };
        }

        const quantity = Number(item.quantity);
        const applied = await applyQuantityDelta(client, inventory.id, direction * quantity);
        if (!applied.ok) {
          return { ok: false, message: applied.error ?? "Could not move stock for this order." };
        }

        if (willConsume && item.unit_cost === null) {
          const { error: costError } = await client
            .from("order_items")
            .update({ unit_cost: Number(inventory.average_cost ?? 0) })
            .eq("id", item.id);
          if (costError) {
            return { ok: false, message: "Could not record the item cost." };
          }
        }

        const movement = await recordStockMovement(client, {
          inventoryItemId: inventory.id,
          movementType: willConsume ? "sale" : "adjustment",
          quantityChange: direction * quantity,
          unitCost: inventory.average_cost === null ? null : Number(inventory.average_cost),
          sourceType: "order",
          sourceId: order.id,
          note: willConsume ? order.order_number : `Restock on cancellation of ${order.order_number}`,
          createdBy: session.userId,
        });
        if (!movement.ok) {
          return { ok: false, message: "Could not record the stock movement." };
        }
      }
    }
  }

  const { error } = await client.from("orders").update({ [field]: value }).eq("id", orderId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the order.") };
  }

  await writeAuditLog(session.userId, "update", "order", orderId, { field, value });

  return { ok: true, message: "Order updated." };
}