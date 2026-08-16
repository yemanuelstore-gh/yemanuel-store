"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { nextDocumentNumber, parseAmount, parseQuantity } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { markPaymentRefunded, recalculateOrderPaymentStatus } from "@/lib/payments/record";

const VALID_RETURN_STATUS = ["pending", "approved", "received", "rejected", "cancelled"];
const VALID_RETURN_REASONS = [
  "wrong_item",
  "damaged",
  "not_as_described",
  "changed_mind",
  "quality",
  "other",
];
const VALID_ITEM_CONDITIONS = ["resellable", "not_resellable"];
const VALID_REFUND_STATUS = ["pending", "processed", "failed", "cancelled"];
const VALID_PAYMENT_METHODS = ["cash", "mobile_money", "card", "bank_transfer", "other"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "A record with the same number already exists.";
    if (text.includes("violates foreign key")) return "A selected reference does not exist.";
    return text;
  }
  return fallback;
}

function parseReturnItems(
  formData: FormData,
): { orderItemId: string; quantity: number; condition: string; refundAmount: number | null }[] {
  const items: ReturnItemsInput = [];
  let index = 0;
  for (;;) {
    const orderItemId = formData.get(`orderItemId-${index}`);
    const quantity = parseQuantity(formData.get(`quantity-${index}`));
    const condition = formData.get(`condition-${index}`);
    const refundAmount = parseAmount(formData.get(`refundAmount-${index}`));
    if (orderItemId === null) break;
    if (
      typeof orderItemId === "string" &&
      orderItemId !== "" &&
      quantity !== null &&
      typeof condition === "string" &&
      VALID_ITEM_CONDITIONS.includes(condition)
    ) {
      items.push({
        orderItemId,
        quantity,
        condition,
        refundAmount,
      });
    }
    index += 1;
  }
  return items;
}

type ReturnItemsInput = {
  orderItemId: string;
  quantity: number;
  condition: string;
  refundAmount: number | null;
}[];

export async function createReturnAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.refund)) {
    return { ok: false, message: "You do not have the sales.refund permission." };
  }

  const orderId = formData.get("orderId");
  const reason = formData.get("reason");
  const reasonNote = formData.get("reasonNote");

  if (typeof orderId !== "string" || orderId === "") {
    return { ok: false, message: "An order is required." };
  }
  if (typeof reason !== "string" || !VALID_RETURN_REASONS.includes(reason)) {
    return { ok: false, message: "Choose a valid return reason." };
  }

  const items = parseReturnItems(formData);
  if (items.length === 0) {
    return { ok: false, message: "Add at least one returned item." };
  }

  const returnNumber = await nextDocumentNumber("RET");
  const client = await createClient();

  const { data: returnData, error: returnError } = await client
    .from("returns")
    .insert({
      return_number: returnNumber,
      order_id: orderId,
      status: "pending",
      reason,
      reason_note:
        typeof reasonNote === "string" && reasonNote.trim() !== "" ? reasonNote.trim() : null,
      created_by: session.staff.id,
    })
    .select("id")
    .single();

  if (returnError) {
    return { ok: false, message: message(returnError, "Could not create the return.") };
  }

  const { data: orderItems } = await client
    .from("order_items")
    .select("id, variant_id, quantity")
    .in(
      "id",
      items.map((item) => item.orderItemId),
    );

  const orderItemMap = new Map(
    ((orderItems ?? []) as unknown as { id: string; variant_id: string; quantity: number }[]).map(
      (item) => [item.id, item],
    ),
  );

  const insertItems = items.flatMap((item) => {
    const orderItem = orderItemMap.get(item.orderItemId);
    if (!orderItem || item.quantity > Number(orderItem.quantity)) return [];
    return {
      return_id: returnData.id,
      order_item_id: item.orderItemId,
      variant_id: orderItem.variant_id,
      quantity_returned: item.quantity,
      condition: item.condition,
      refund_amount: item.refundAmount,
    };
  });

  if (insertItems.length === 0) {
    return { ok: false, message: "None of the selected items could be returned (check quantities)." };
  }

  const { error: itemsError } = await client.from("return_items").insert(insertItems);

  if (itemsError) {
    return { ok: false, message: message(itemsError, "Could not add returned items.") };
  }

  await writeAuditLog(session.userId, "create", "return", returnData.id, {
    returnNumber,
    itemCount: items.length,
  });

  redirect(`/admin/returns/${returnData.id}`);
}

export async function updateReturnStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.refund)) {
    return { ok: false, message: "You do not have the sales.refund permission." };
  }

  const returnId = formData.get("returnId");
  const status = formData.get("status");
  if (typeof returnId !== "string" || returnId === "") {
    return { ok: false, message: "Missing return." };
  }
  if (typeof status !== "string" || !VALID_RETURN_STATUS.includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { error } = await client
    .from("returns")
    .update({ status, approved_by: session.staff.id })
    .eq("id", returnId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the return.") };
  }

  await writeAuditLog(session.userId, "update", "return", returnId, { status });

  return { ok: true, message: "Return updated." };
}

export async function createRefundAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.refund)) {
    return { ok: false, message: "You do not have the sales.refund permission." };
  }

  const orderId = formData.get("orderId");
  const returnId = formData.get("returnId");
  const paymentId = formData.get("paymentId");
  const amount = parseAmount(formData.get("amount"));
  const method = formData.get("method");
  const refundDate = formData.get("refundDate");
  const reference = formData.get("reference");
  const reason = formData.get("reason");

  if (typeof orderId !== "string" || orderId === "") {
    return { ok: false, message: "An order is required." };
  }
  if (amount === null || amount <= 0) {
    return { ok: false, message: "Enter a valid refund amount." };
  }
  if (typeof method !== "string" || !VALID_PAYMENT_METHODS.includes(method)) {
    return { ok: false, message: "Choose a valid refund method." };
  }
  if (typeof refundDate !== "string" || refundDate.trim() === "") {
    return { ok: false, message: "The refund date is required." };
  }

  const linkedPaymentId =
    typeof paymentId === "string" && paymentId !== "" ? paymentId : null;

  const refundNumber = await nextDocumentNumber("RFD");
  const client = await createClient();

  if (linkedPaymentId !== null) {
    const { data: paymentRow, error: paymentError } = await client
      .from("payments")
      .select("id, order_id, status")
      .eq("id", linkedPaymentId)
      .maybeSingle();
    if (paymentError || !paymentRow) {
      return { ok: false, message: "The linked payment was not found." };
    }
    const payment = paymentRow as unknown as { id: string; order_id: string; status: string };
    if (payment.order_id !== orderId) {
      return { ok: false, message: "The linked payment belongs to a different order." };
    }
    if (payment.status !== "paid" && payment.status !== "authorized") {
      return { ok: false, message: "Only paid payments can be refunded against." };
    }
  }

  const { data, error } = await client
    .from("refunds")
    .insert({
      refund_number: refundNumber,
      order_id: orderId,
      return_id: typeof returnId === "string" && returnId !== "" ? returnId : null,
      payment_id: linkedPaymentId,
      amount,
      method,
      status: "pending",
      reference: typeof reference === "string" && reference.trim() !== "" ? reference.trim() : null,
      reason: typeof reason === "string" && reason.trim() !== "" ? reason.trim() : null,
      processed_by: session.staff.id,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not record the refund.") };
  }

  await writeAuditLog(session.userId, "create", "refund", data.id, {
    refundNumber,
    amount,
  });

  redirect(`/admin/refunds/${data.id}`);
}

export async function updateRefundStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.refund)) {
    return { ok: false, message: "You do not have the sales.refund permission." };
  }

  const refundId = formData.get("refundId");
  const status = formData.get("status");
  if (typeof refundId !== "string" || refundId === "") {
    return { ok: false, message: "Missing refund." };
  }
  if (typeof status !== "string" || !VALID_REFUND_STATUS.includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { data: current } = await client
    .from("refunds")
    .select("id, order_id, payment_id, status")
    .eq("id", refundId)
    .maybeSingle();

  if (!current) {
    return { ok: false, message: "Refund not found." };
  }

  const refundRow = current as unknown as {
    id: string;
    order_id: string;
    payment_id: string | null;
    status: string;
  };

  const { error } = await client.from("refunds").update({ status }).eq("id", refundId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the refund.") };
  }

  if (status === "processed") {
    if (refundRow.payment_id) {
      await markPaymentRefunded(
        refundRow.payment_id,
        `Refund ${refundId} processed`,
      );
    }
    await recalculateOrderPaymentStatus(refundRow.order_id);
  }

  await writeAuditLog(session.userId, "update", "refund", refundId, { status });

  return { ok: true, message: "Refund updated." };
}