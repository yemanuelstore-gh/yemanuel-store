import { writeAuditLog } from "@/lib/admin/audit";
import { isServiceConfigured, createServiceClient } from "@/lib/supabase/service";
import { makePaymentReference } from "@/lib/payments/references";
import type { PaymentMethod, PaymentStatus } from "@/lib/payments/types";

type ServiceClient = ReturnType<typeof createServiceClient>;

function client(): ServiceClient | null {
  if (!isServiceConfigured()) return null;
  return createServiceClient();
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Create a pending payment record for an order. Idempotent: an existing
 * pending payment for the same order and method is returned instead of
 * inserting a duplicate (protects against double-clicked submits and page
 * refreshes).
 */
export async function createPendingPayment({
  orderId,
  amount,
  method,
  provider,
  providerReference = null,
  notes,
}: {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  provider?: string | null;
  providerReference?: string | null;
  notes?: string | null;
}): Promise<{ paymentId: string; reference: string; created: boolean } | null> {
  const service = client();
  if (!service) return null;

  const existing = await service
    .from("payments")
    .select("id, reference")
    .eq("order_id", orderId)
    .eq("method", method)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existing.error) return null;
  if (existing.data) {
    const row = existing.data as unknown as { id: string; reference: string | null };
    return {
      paymentId: row.id,
      reference: row.reference ?? makePaymentReference(),
      created: false,
    };
  }

  const reference = makePaymentReference();
  const { data, error } = await service
    .from("payments")
    .insert({
      order_id: orderId,
      amount: money(amount),
      method,
      status: "pending",
      reference,
      provider,
      provider_reference: providerReference,
      notes: notes ?? null,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) return null;

  return { paymentId: (data as unknown as { id: string }).id, reference, created: true };
}

/**
 * Attach the provider's transaction reference to a pending payment after the
 * provider initiation call has succeeded. The reference is what webhooks and
 * return-callbacks use to correlate the provider transaction with our record.
 */
export async function setPaymentProviderReference({
  paymentId,
  provider,
  providerReference,
}: {
  paymentId: string;
  provider: string;
  providerReference: string;
}): Promise<boolean> {
  const service = client();
  if (!service) return false;

  const { error } = await service
    .from("payments")
    .update({ provider, provider_reference: providerReference })
    .eq("id", paymentId)
    .eq("status", "pending");
  return !error;
}

export type VerifiedPaymentInput = {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  provider: string;
  providerReference: string;
  status: Extract<PaymentStatus, "paid" | "authorized">;
  paymentId?: string | null;
  notes?: string | null;
};

/**
 * Record a payment whose success has been confirmed by a verified source
 * (webhook, provider verification call or authorized staff).
 *
 * Idempotency: the provider reference is the source of truth. If a payment
 * already carries this provider reference, the existing record is returned
 * and nothing is rewritten — repeated webhooks and retries can never create
 * duplicate successful payments.
 */
export async function applyVerifiedPayment(
  input: VerifiedPaymentInput,
): Promise<{ paymentId: string | null; reason: string }> {
  const service = client();
  if (!service) return { paymentId: null, reason: "payments unavailable" };

  const existing = await service
    .from("payments")
    .select("id, status, order_id")
    .eq("provider_reference", input.providerReference)
    .limit(1)
    .maybeSingle();

  if (existing.error) {
    return { paymentId: null, reason: "could not check existing payment" };
  }
  if (existing.data) {
    const row = existing.data as unknown as {
      id: string;
      status: string;
      order_id: string;
    };
    if (row.order_id !== input.orderId) {
      return { paymentId: null, reason: "provider reference belongs to another order" };
    }
    await recalculateOrderPaymentStatus(input.orderId);
    return { paymentId: row.id, reason: "already recorded" };
  }

  const insert = {
    order_id: input.orderId,
    amount: money(input.amount),
    method: input.method,
    status: input.status,
    provider: input.provider,
    provider_reference: input.providerReference,
    notes: input.notes ?? null,
  };

  if (input.paymentId) {
    const { error } = await service
      .from("payments")
      .update({ ...insert, status: input.status })
      .eq("id", input.paymentId);
    if (error) {
      return { paymentId: null, reason: "could not update payment record" };
    }
    await recalculateOrderPaymentStatus(input.orderId);
    return { paymentId: input.paymentId, reason: "updated" };
  }

  const { data, error } = await service
    .from("payments")
    .insert({ ...insert, reference: makePaymentReference() })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { paymentId: null, reason: "could not record payment" };
  }

  const paymentId = (data as unknown as { id: string }).id;
  await recalculateOrderPaymentStatus(input.orderId);

  try {
    await writeAuditLog(
      "00000000-0000-0000-0000-000000000000",
      "create",
      "payment",
      paymentId,
      {
        orderId: input.orderId,
        provider: input.provider,
        providerReference: input.providerReference,
        amount: money(input.amount),
      },
    );
  } catch {
    // Best-effort audit logging.
  }

  return { paymentId, reason: "recorded" };
}

/**
 * Mark a payment as failed/void/cancelled without pretending success. The
 * payment history row is preserved; its status is updated to `void` so the
 * order can be retried or rescheduled.
 */
export async function voidPayment(
  paymentId: string,
  notes?: string,
): Promise<boolean> {
  const service = client();
  if (!service) return false;

  const { data } = await service
    .from("payments")
    .select("id, order_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!data) return false;

  const { error } = await service
    .from("payments")
    .update({ status: "void", notes: notes ?? null })
    .eq("id", paymentId);
  if (error) return false;

  const orderId = (data as unknown as { order_id: string }).order_id;
  await recalculateOrderPaymentStatus(orderId);
  return true;
}

/**
 * Mark a paid (or authorized) payment as refunded when a refund is processed.
 * Only positive-status payments are touched; history is preserved.
 */
export async function markPaymentRefunded(
  paymentId: string,
  notes?: string,
): Promise<boolean> {
  const service = client();
  if (!service) return false;

  const { data } = await service
    .from("payments")
    .select("id, order_id, status")
    .eq("id", paymentId)
    .maybeSingle();
  if (!data) return false;

  const row = data as unknown as { id: string; order_id: string; status: string };
  if (row.status !== "paid" && row.status !== "authorized") return true;

  const { error } = await service
    .from("payments")
    .update({ status: "refunded", notes: notes ?? null })
    .eq("id", paymentId);
  if (error) return false;

  await recalculateOrderPaymentStatus(row.order_id);
  return true;
}

/**
 * Recompute an order's payment_status from its actual payment history.
 * Historical payment rows are never modified — the order-level status is
 * derived, not stored as an event.
 *
 * - any processed refund covers all paid value  -> refunded
 * - some processed refunds against paid value   -> partially_refunded
 * - paid value >= order total                   -> paid
 * - some paid value                             -> partially_paid
 * - otherwise                                   -> unpaid
 */
export async function recalculateOrderPaymentStatus(
  orderId: string,
): Promise<string | null> {
  const service = client();
  if (!service) return null;

  const [orderResult, paymentsResult, refundsResult] = await Promise.all([
    service.from("orders").select("id, total_amount").eq("id", orderId).maybeSingle(),
    service.from("payments").select("amount, status").eq("order_id", orderId),
    service
      .from("refunds")
      .select("amount, status, order_id")
      .eq("order_id", orderId)
      .eq("status", "processed"),
  ]);

  if (orderResult.error || !orderResult.data) return null;

  const totalAmount = Number(
    (orderResult.data as unknown as { total_amount: number }).total_amount,
  );

  const paidTotal = ((paymentsResult.data ?? []) as unknown as { amount: number; status: string }[])
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const refundedTotal = ((refundsResult.data ?? []) as unknown as { amount: number }[]).reduce(
    (sum, refund) => sum + Number(refund.amount),
    0,
  );

  let nextStatus: string;
  if (paidTotal > 0 && refundedTotal >= paidTotal - 0.005) {
    nextStatus = "refunded";
  } else if (paidTotal > 0 && refundedTotal > 0) {
    nextStatus = "partially_refunded";
  } else if (paidTotal >= totalAmount - 0.005) {
    nextStatus = "paid";
  } else if (paidTotal > 0) {
    nextStatus = "partially_paid";
  } else {
    nextStatus = "unpaid";
  }

  const current = (orderResult.data as unknown as { payment_status?: string }).payment_status;
  if (current === nextStatus) return nextStatus;

  const { error } = await service
    .from("orders")
    .update({ payment_status: nextStatus })
    .eq("id", orderId);
  if (error) return null;

  return nextStatus;
}