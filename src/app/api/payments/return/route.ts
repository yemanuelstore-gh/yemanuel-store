import { NextRequest, NextResponse } from "next/server";
import { isServiceConfigured, createServiceClient } from "@/lib/supabase/service";
import { isPaymentReference } from "@/lib/payments/references";
import { getActivePaymentProvider } from "@/lib/payments/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function storefrontUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (base === "") return path;
  const normalized = base.replace(/\/+$/, "");
  return `${normalized}${path}`;
}

/**
 * Customer callback after an attempt to pay with a provider-based method
 * (mobile money / card). The provider redirects the customer here; the
 * transaction outcome is verified server-side with the provider before the
 * customer is redirected to their order page. Never trusts redirect params.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const reference = request.nextUrl.searchParams.get("reference") ?? "";
  const providerReference =
    request.nextUrl.searchParams.get("provider_reference") ??
    request.nextUrl.searchParams.get("providerReference");

  if (!isPaymentReference(reference)) {
    return NextResponse.redirect(storefrontUrl("/"), 303);
  }

  const provider = getActivePaymentProvider();
  if (!provider) {
    return NextResponse.redirect(storefrontUrl("/"), 303);
  }

  if (!isServiceConfigured()) {
    return NextResponse.redirect(storefrontUrl("/"), 303);
  }
  const service = createServiceClient();

  const paymentResult = await service
    .from("payments")
    .select("id, order_id, method, amount")
    .eq("reference", reference)
    .maybeSingle();

  if (paymentResult.error || !paymentResult.data) {
    return NextResponse.redirect(storefrontUrl("/"), 303);
  }

  const payment = paymentResult.data as unknown as {
    id: string;
    order_id: string;
    method: string;
    amount: number;
  };

  const orderResult = await service
    .from("orders")
    .select("order_number, customer_id")
    .eq("id", payment.order_id)
    .maybeSingle();

  if (orderResult.error || !orderResult.data) {
    return NextResponse.redirect(storefrontUrl("/"), 303);
  }

  const order = orderResult.data as unknown as { order_number: string };

  if (!providerReference) {
    return NextResponse.redirect(
      storefrontUrl(`/checkout/payment/${order.order_number}?status=pending`),
      303,
    );
  }

  const verification = await provider.verifyPayment({
    orderId: payment.order_id,
    paymentId: payment.id,
    providerReference,
  });

  if (verification.status === "paid" || verification.status === "authorized") {
    const recordModule = await import("@/lib/payments/record");
    const recorded = await recordModule.applyVerifiedPayment({
      orderId: payment.order_id,
      amount: Number(payment.amount),
      method: payment.method as "mobile_money" | "card",
      provider: provider.id,
      providerReference: verification.providerReference,
      paymentId: payment.id,
      status: verification.status,
    });
    if (recorded.paymentId === null) {
      return NextResponse.redirect(
        storefrontUrl(`/checkout/payment/${order.order_number}?status=failed`),
        303,
      );
    }
    return NextResponse.redirect(
      storefrontUrl(`/checkout/success/${order.order_number}?payment=confirmed`),
      303,
    );
  }

  if (verification.status === "void") {
    const recordModule = await import("@/lib/payments/record");
    await recordModule.voidPayment(payment.id, "customer cancelled at provider");
    return NextResponse.redirect(
      storefrontUrl(`/checkout/payment/${order.order_number}?status=cancelled`),
      303,
    );
  }

  return NextResponse.redirect(
    storefrontUrl(`/checkout/payment/${order.order_number}?status=pending`),
    303,
  );
}