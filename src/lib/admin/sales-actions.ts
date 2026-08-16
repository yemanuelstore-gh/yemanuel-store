"use server";

import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
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
  const { error } = await client.from("orders").update({ [field]: value }).eq("id", orderId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the order.") };
  }

  await writeAuditLog(session.userId, "update", "order", orderId, { field, value });

  return { ok: true, message: "Order updated." };
}