import { createHmac, timingSafeEqual } from "node:crypto";
import { isWebhookSecretConfigured, getProviderWebhookSecret } from "@/lib/payments/config";
import type { PaymentProvider } from "@/lib/payments/types";

export function safeParseJson<T>(text: string): T | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Verify an HMAC-SHA256 signature over the raw request body. Used to confirm
 * a webhook actually came from the payment provider. Timing-safe comparison
 * prevents side-channel leaks.
 */
export function verifyHmacSignature(
  payload: string,
  signature: string | null | undefined,
): boolean {
  if (!isWebhookSecretConfigured()) return false;
  const secret = getProviderWebhookSecret();
  if (secret === "" || typeof signature !== "string" || signature === "") {
    return false;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const received = signature.trim();

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

export type WebhookExtracted = {
  orderId?: string;
  paymentId?: string;
  providerReference?: string;
  amount?: number;
};

export type WebhookProcessResult =
  | { status: "processed"; detail: string }
  | { status: "ignored"; detail: string }
  | { status: "rejected"; detail: string };

/**
 * Generic webhook processing boundary.
 *
 * A provider adapter owns the mapping between its raw payload and our
 * payment record. This function:
 *   1. verifies the payload signature (rejects invalid callbacks),
 *   2. asks the provider to verify the transaction status server-side,
 *   3. records the verified payment through the idempotent payment core,
 *   4. returns a result for the HTTP response — secrets are never logged.
 */
export async function processProviderWebhook(
  provider: PaymentProvider,
  rawBody: string,
  signature: string | null | undefined,
  extract: (payload: unknown) => WebhookExtracted | null,
): Promise<WebhookProcessResult> {
  if (!verifyHmacSignature(rawBody, signature)) {
    return { status: "rejected", detail: "invalid signature" };
  }

  const payload = safeParseJson<unknown>(rawBody);
  if (payload === null) {
    return { status: "rejected", detail: "invalid payload" };
  }

  const extracted = extract(payload);
  if (!extracted) {
    return { status: "ignored", detail: "event not related to a payment" };
  }
  if (!extracted.providerReference) {
    return { status: "ignored", detail: "missing provider reference" };
  }
  if (!extracted.orderId && !extracted.paymentId) {
    return { status: "ignored", detail: "missing payment identifiers" };
  }

  const verification = await provider.verifyPayment({
    orderId: extracted.orderId ?? "",
    paymentId: extracted.paymentId ?? "",
    providerReference: extracted.providerReference,
  });

  if (verification.status === "paid" || verification.status === "authorized") {
    const recordModule = await import("@/lib/payments/record");
    const recorded = await recordModule.applyVerifiedPayment({
      orderId: extracted.orderId ?? "",
      amount: extracted.amount ?? 0,
      method: provider.methods[0] === "card" ? "card" : "mobile_money",
      provider: provider.id,
      providerReference: verification.providerReference,
      paymentId: extracted.paymentId ?? null,
      status: verification.status,
    });
    if (recorded.paymentId === null) {
      return { status: "rejected", detail: "payment could not be recorded" };
    }
    return { status: "processed", detail: "payment recorded" };
  }

  if (verification.status === "void" && extracted.paymentId) {
    const recordModule = await import("@/lib/payments/record");
    const voided = await recordModule.voidPayment(extracted.paymentId ?? "");
    return {
      status: voided ? "processed" : "ignored",
      detail: voided ? "payment voided" : "no payment to void",
    };
  }

  return {
    status: "ignored",
    detail: `verification returned ${verification.status}`,
  };
}