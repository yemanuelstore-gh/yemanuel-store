import { NextRequest, NextResponse } from "next/server";
import { getActivePaymentProvider } from "@/lib/payments/registry";
import {
  processProviderWebhook,
  type WebhookExtracted,
} from "@/lib/payments/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function readSignature(request: NextRequest): string | null {
  const candidates = [
    "x-hubtel-signature",
    "x-paystack-signature",
    "x-korba-signature",
    "x-signature",
    "hubtel-signature",
  ];
  for (const name of candidates) {
    const value = request.headers.get(name);
    if (value) return value;
  }
  return null;
}

function defaultExtract(payload: unknown): WebhookExtracted | null {
  if (typeof payload !== "object" || payload === null) return null;
  const record = payload as Record<string, unknown>;

  const firstString = (...keys: string[]): string | undefined => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value !== "") return value;
    }
    return undefined;
  };

  const firstNumber = (...keys: string[]): number | undefined => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
    return undefined;
  };

  const providerReference =
    firstString(
      "provider_reference",
      "providerReference",
      "transaction_id",
      "transactionId",
      "clientReference",
      "ClientReference",
      "token",
    ) ??
    firstString("reference", "tx_ref", "tran_id");

  const orderId = firstString("order_id", "orderId", "order");
  const paymentId = firstString("payment_id", "paymentId");
  const amount = firstNumber("amount");

  if (!providerReference) return null;
  return {
    orderId,
    paymentId,
    providerReference,
    amount,
  };
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider: providerId } = await context.params;
  const provider = getActivePaymentProvider();

  if (!provider || provider.id !== providerId) {
    return NextResponse.json(
      { status: "rejected", detail: "provider not configured" },
      { status: 501 },
    );
  }

  const rawBody = await request.text();
  const signature = readSignature(request);

  const result = await processProviderWebhook(provider, rawBody, signature, defaultExtract);

  const statusCode =
    result.status === "rejected" ? 401 : result.status === "processed" ? 200 : 202;

  return NextResponse.json(result, { status: statusCode });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { status: "ignored", detail: "webhook endpoint expects POST" },
    { status: 405 },
  );
}