"use server";

import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { recalculateOrderPaymentStatus } from "@/lib/payments/record";

const MANUAL_METHODS = ["bank_transfer", "cash", "mobile_money"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return fallback;
}

/**
 * Confirm that a manual payment (bank transfer, mobile money or cash)
 * actually arrived.
 * Only a staff member with sales.update may verify a payment; the update runs
 * through the authenticated client so the RLS policy applies. The order's
 * payment status is then recomputed from real payment history.
 */
export async function verifyManualPaymentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.update)) {
    return { ok: false, message: "You do not have the sales.update permission." };
  }

  const paymentId = formData.get("paymentId");
  const reference = formData.get("reference");
  const notes = formData.get("notes");

  if (typeof paymentId !== "string" || paymentId === "") {
    return { ok: false, message: "Missing payment." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("payments")
    .select("id, order_id, method, status, amount, reference")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Payment not found." };
  }

  const payment = data as unknown as {
    id: string;
    order_id: string;
    method: string;
    status: string;
    amount: number;
    reference: string | null;
  };

  if (!MANUAL_METHODS.includes(payment.method)) {
    return {
      ok: false,
      message: "Only bank transfer, mobile money and cash payments are verified manually.",
    };
  }
  if (payment.status !== "pending") {
    return { ok: false, message: `This payment is already ${payment.status}.` };
  }

  const nextReference =
    typeof reference === "string" && reference.trim() !== "" ? reference.trim() : payment.reference;
  const nextNotes =
    typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null;

  const { error: updateError } = await client
    .from("payments")
    .update({
      status: "paid",
      payment_date: new Date().toISOString(),
      received_by: session.staff.id,
      reference: nextReference,
      notes: nextNotes,
    })
    .eq("id", paymentId);

  if (updateError) {
    return { ok: false, message: message(updateError, "Could not verify the payment.") };
  }

  await writeAuditLog(session.userId, "update", "payment", paymentId, {
    status: "paid",
    method: payment.method,
    amount: Number(payment.amount),
    receivedBy: session.staff.id,
  });

  await recalculateOrderPaymentStatus(payment.order_id);

  return { ok: true, message: "Payment verified and recorded as paid." };
}

/**
 * Void a pending payment (e.g. the customer never completed the payment).
 * Preserves the history row and lets the order be paid another way.
 */
export async function voidPaymentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.update)) {
    return { ok: false, message: "You do not have the sales.update permission." };
  }

  const paymentId = formData.get("paymentId");
  if (typeof paymentId !== "string" || paymentId === "") {
    return { ok: false, message: "Missing payment." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("payments")
    .select("id, order_id, status, amount, method")
    .eq("id", paymentId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Payment not found." };
  }

  const payment = data as unknown as {
    id: string;
    order_id: string;
    status: string;
    amount: number;
    method: string;
  };

  if (payment.status !== "pending") {
    return { ok: false, message: `Only pending payments can be voided (current: ${payment.status}).` };
  }

  const { error: updateError } = await client
    .from("payments")
    .update({ status: "void", received_by: session.staff.id })
    .eq("id", paymentId);

  if (updateError) {
    return { ok: false, message: message(updateError, "Could not void the payment.") };
  }

  await writeAuditLog(session.userId, "update", "payment", paymentId, {
    status: "void",
    method: payment.method,
    amount: Number(payment.amount),
    receivedBy: session.staff.id,
  });

  await recalculateOrderPaymentStatus(payment.order_id);

  return { ok: true, message: "Payment marked as void." };
}