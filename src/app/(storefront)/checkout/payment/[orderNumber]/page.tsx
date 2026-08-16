import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/storefront/button-link";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { getOrderReceipt } from "@/lib/orders";
import { formatGHS } from "@/lib/format";

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ status?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Payment — Order ${orderNumber} — Yemanuel Store`,
    description: "Payment status for your Yemanuel Store order.",
  };
}

export const dynamic = "force-dynamic";

export default async function OrderPaymentPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const { status } = await searchParams;

  let authorized = false;
  try {
    const store = await cookies();
    const raw = store.get("ys_order_receipt")?.value;
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (
        typeof parsed === "object" &&
        parsed !== null &&
        (parsed as { orderNumber?: unknown }).orderNumber === orderNumber
      ) {
        authorized = true;
      }
    }
  } catch {
    authorized = false;
  }

  let receipt: Awaited<ReturnType<typeof getOrderReceipt>> = null;
  if (authorized) {
    receipt = await getOrderReceipt(orderNumber).catch(() => null);
  }

  const paymentStatus = receipt?.paymentStatus ?? null;
  const paid = paymentStatus === "paid" || paymentStatus === "authorized";
  const cancelledByCustomer =
    paymentStatus === "void" || status === "cancelled";
  const failed = status === "failed";
  const pending = !paid && !cancelledByCustomer && !failed;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      {authorized && receipt === null ? (
        <RetryPanel
          retryHref={`/checkout/payment/${orderNumber}`}
          message="We could not load your payment status. Please try again."
        />
      ) : !authorized || receipt === null ? (
        <Card className="p-10 text-center lg:p-14">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-soft">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-navy"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <h1 className="mt-5 font-display text-2xl font-medium tracking-tight text-ink">
            We could not find this payment
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
            Payment details are only available right after placing an order. If
            you need help, contact the store with your order number.
          </p>
          <div className="mt-7">
            <ButtonLink href="/shop">Continue shopping</ButtonLink>
          </div>
        </Card>
      ) : (
        <Card className="p-10 text-center lg:p-14">
          <div
            className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
              paid ? "bg-navy" : pending ? "bg-navy-soft" : "bg-gold-soft"
            }`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`h-6 w-6 ${
                paid ? "text-ivory" : pending ? "text-navy" : "text-gold-dark"
              }`}
            >
              {paid ? (
                <path d="m4 12 5 5L20 6" />
              ) : pending ? (
                <>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </>
              ) : (
                <path d="m8 8 8 8" />
              )}
            </svg>
          </div>
          <h1 className="mt-5 font-display text-2xl font-medium tracking-tight text-ink">
            {paid && "Your payment has been confirmed"}
            {pending && "Your payment is still being confirmed"}
            {cancelledByCustomer && "Your payment was cancelled"}
            {failed && "We could not confirm your payment"}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
            {paid &&
              `Order ${orderNumber} is paid. Thank you — we will prepare your order for ${receipt.deliveryMethodName}.`}
            {pending &&
              `Order ${orderNumber} is on hold until we confirm payment. Nothing has been charged yet — refresh this page shortly or contact the store for help.`}
            {cancelledByCustomer &&
              `Order ${orderNumber} was not paid. Your order is still saved — contact the store to arrange payment or place a new order.`}
            {failed &&
              `Order ${orderNumber} could not be paid. Nothing was charged. Contact the store to arrange payment or try again later.`}
          </p>

          <dl className="mx-auto mt-8 max-w-sm space-y-2 rounded-md border border-line bg-paper px-5 py-4 text-left text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-soft">Order</dt>
              <dd className="font-mono font-semibold text-ink">{orderNumber}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-soft">Amount</dt>
              <dd className="font-semibold text-ink">
                {formatGHS(receipt.totalAmount)}
              </dd>
            </div>
            {receipt.paymentMethod && (
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Method</dt>
                <dd className="capitalize text-ink">{receipt.paymentMethod}</dd>
              </div>
            )}
            {receipt.paymentReference && (
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Reference</dt>
                <dd className="font-mono text-xs text-ink-soft">
                  {receipt.paymentReference}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink
              href={`/checkout/payment/${orderNumber}`}
              variant={pending ? "secondary" : "primary"}
            >
              {pending ? "Refresh status" : "Continue shopping"}
            </ButtonLink>
            {pending && (
              <ButtonLink href="/shop" variant="secondary">
                Continue shopping
              </ButtonLink>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}