import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/storefront/button-link";
import { ProductImage } from "@/components/storefront/product-image";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { getOrderReceipt } from "@/lib/orders";
import { getManualPaymentConfig } from "@/lib/payments/manual";
import { formatGHS, formatGhanaPhone } from "@/lib/format";

type Props = {
  params: Promise<{ orderNumber: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber} — Yemanuel Store`,
    description: "Your order confirmation from Yemanuel Store.",
  };
}

export default async function OrderSuccessPage({ params }: Props) {
  const { orderNumber } = await params;

  let receiptCookie: { orderNumber?: unknown } | null = null;
  try {
    const store = await cookies();
    const raw = store.get("ys_order_receipt")?.value;
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed === "object" && parsed !== null) {
        receiptCookie = parsed as { orderNumber?: unknown };
      }
    }
  } catch {
    receiptCookie = null;
  }

  const authorized =
    typeof receiptCookie?.orderNumber === "string" &&
    receiptCookie.orderNumber === orderNumber;

  let receipt: Awaited<ReturnType<typeof getOrderReceipt>> = null;
  if (authorized) {
    receipt = await getOrderReceipt(orderNumber).catch(() => null);
  }

  const manualPayment = receipt === null ? null : await getManualPaymentConfig();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      {authorized && receipt === null ? (
        <RetryPanel
          retryHref={`/checkout/success/${orderNumber}`}
          message="We could not load your confirmation. Please try again."
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
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
              <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.7 3.86a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <h1 className="mt-5 font-display text-2xl font-medium tracking-tight text-ink">
            We could not find this confirmation
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
            Order confirmations are only available right after placing an order.
            If you need help, contact the store with your order number.
          </p>
          <div className="mt-7">
            <ButtonLink href="/shop">Continue shopping</ButtonLink>
          </div>
        </Card>
      ) : (
        <>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-navy">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-ivory"
            >
              <path d="m4 12 5 5L20 6" />
            </svg>
          </div>
          <h1 className="mt-6 text-center font-display text-3xl font-medium tracking-tight text-ink lg:text-4xl">
            Thank you, {receipt.guestName.split(" ")[0] || "your order"} has
            been received
          </h1>
          <p className="mt-3 text-center text-sm leading-6 text-ink-soft">
            Order{" "}
            <span className="font-semibold text-navy">{receipt.orderNumber}</span>{" "}
            was placed on{" "}
            {new Date(receipt.placedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            .
          </p>

          <Card className="mt-10 p-6 lg:p-8">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink">
              Order summary
            </h2>
            <ul className="mt-5 space-y-4 border-b border-line pb-5">
              {receipt.items.map((item, index) => (
                <li key={`${item.sku}-${index}`} className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-md border border-line bg-navy-soft">
                      <ProductImage
                        src={item.imageUrl}
                        alt={item.productName}
                        sizes="48px"
                        fallbackLetter={item.productName.charAt(0)}
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-ink">{item.productName}</p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {item.variantName} · SKU {item.sku} · {item.quantity} ×{" "}
                        {formatGHS(item.unitPrice)}
                      </p>
                    </div>
                  </div>
                  <p className="flex-shrink-0 text-sm font-semibold text-ink">
                    {formatGHS(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Subtotal</dt>
                <dd className="font-semibold text-ink">{formatGHS(receipt.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Delivery ({receipt.deliveryMethodName})</dt>
                <dd className="font-semibold text-ink">{formatGHS(receipt.deliveryFee)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3">
                <dt className="font-medium text-ink">Total</dt>
                <dd className="text-lg font-semibold text-ink">
                  {formatGHS(receipt.totalAmount)}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="mt-6 p-6 lg:p-8">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink">
              Payment
            </h2>
            <PaymentStatusPanel receipt={receipt} manualPayment={manualPayment} />
          </Card>

          <Card className="mt-6 p-6 lg:p-8">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink">
              Delivery information
            </h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Recipient</dt>
                <dd className="text-right font-medium text-ink">
                  {receipt.deliveryRecipient}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Phone</dt>
                <dd className="text-right font-medium text-ink">
                  {formatGhanaPhone(receipt.deliveryPhone)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Method</dt>
                <dd className="text-right font-medium text-ink">
                  {receipt.deliveryMethodName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-soft">Address</dt>
                <dd className="text-right font-medium text-ink">
                  {receipt.deliveryAddressLine1}
                  {receipt.deliveryAddressLine2
                    ? `, ${receipt.deliveryAddressLine2}`
                    : ""}
                  <br />
                  {receipt.deliveryCity}, {receipt.deliveryRegion}
                </dd>
              </div>
            </dl>
          </Card>

          <Card className="mt-6 p-6 lg:p-8">
            <h2 className="font-display text-lg font-medium tracking-tight text-ink">
              What happens next
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-6 text-ink-soft">
              <li>Our team will review your order shortly.</li>
              <li>
                We will contact you on your provided phone number to confirm
                delivery details.
              </li>
              <li>Your order will be prepared and delivered.</li>
            </ol>
          </Card>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/shop">Continue shopping</ButtonLink>
            <ButtonLink href="/account" variant="secondary">
              View your account
            </ButtonLink>
          </div>
          <p className="mt-4 text-center text-xs text-ink-faint">
            Keep your order number for reference:{" "}
            <Link
              href={`/checkout/success/${receipt.orderNumber}`}
              className="font-semibold text-navy hover:text-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              {receipt.orderNumber}
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

function PaymentStatusPanel({
  receipt,
  manualPayment,
}: {
  receipt: {
    paymentMethod: string | null;
    paymentStatus: string | null;
    paymentReference: string | null;
    totalAmount: number;
  };
  manualPayment: Awaited<ReturnType<typeof getManualPaymentConfig>> | null;
}) {
  const method = receipt.paymentMethod;
  const status = receipt.paymentStatus;
  const amount = formatGHS(receipt.totalAmount);
  const momoNumber = manualPayment?.momoNumber ?? null;
  const momoName = manualPayment?.momoName ?? null;

  if (status === "paid" || status === "authorized") {
    return (
      <div className="mt-5">
        <div className="flex items-center gap-3 rounded-md border border-gold-dark/25 bg-gold-soft px-4 py-3">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 flex-shrink-0 text-gold-dark"
          >
            <path d="m4 12 5 5L20 6" />
          </svg>
          <p className="text-sm leading-6 text-ink">
            <span className="font-semibold">Payment received.</span> Thank you —
            your {amount} payment has been confirmed.
          </p>
        </div>
        <p className="mt-3 text-xs leading-5 text-ink-soft">
          Reference:{" "}
          <span className="font-mono font-semibold text-navy">
            {receipt.paymentReference}
          </span>
        </p>
      </div>
    );
  }

  if (status === "pending" || status === null) {
    return (
      <div className="mt-5">
        <div className="flex items-start gap-3 rounded-md border border-line-strong bg-paper px-4 py-3">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-navy"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <div>
            <p className="text-sm font-medium text-ink">
              {method === "bank_transfer"
                ? "Awaiting your transfer — your order is on hold"
                : method === "cash"
                  ? "Pay on delivery"
                  : method === "mobile_money"
                    ? "Awaiting your Mobile Money payment — your order is on hold"
                    : "Payment is being arranged"}
            </p>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              {method === "bank_transfer" &&
                `Transfer ${amount} to the store's bank account. We will confirm your payment and dispatch your order once the funds arrive — no payment has been taken yet.`}
              {method === "mobile_money" &&
                `Send ${amount} via Mobile Money to ${momoNumber ?? "the store's Mobile Money number"}${momoName ? ` (${momoName})` : ""}. We will confirm your payment and dispatch your order once the funds arrive — no payment has been taken yet.`}
              {method === "cash" &&
                `Please have ${amount} ready in cash when your order is delivered.`}
              {method !== "bank_transfer" &&
                method !== "cash" &&
                method !== "mobile_money" &&
                "Your order is being prepared. We will contact you to arrange payment."}
            </p>
          </div>
        </div>
        {receipt.paymentReference && (
          <p className="mt-3 text-xs leading-5 text-ink-soft">
            Payment reference:{" "}
            <span className="font-mono font-semibold text-navy">
              {receipt.paymentReference}
            </span>
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5">
      <p className="text-sm leading-6 text-ink-soft">
        Payment status:{" "}
        <span className="font-medium capitalize text-ink">{status}</span>. If you
        have already paid, contact the store with your order number and we will
        resolve it right away.
      </p>
    </div>
  );
}