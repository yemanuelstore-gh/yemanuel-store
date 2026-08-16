import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { StatusBadge } from "@/components/storefront/status-badge";
import { trackOrder, type TrackedOrder } from "@/lib/tracking";
import { isServiceConfigured } from "@/lib/supabase/service";
import { isValidGhanaPhone } from "@/lib/validation";
import {
  deliveryStatusLabel,
  deliveryStatusTone,
  orderStatusLabel,
  orderStatusTone,
} from "@/lib/status";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Track your order — Yemanuel Store",
  description:
    "Track your Yemanuel Store order in Ghana — see its status and delivery progress.",
};

type SearchParams = Promise<{ order?: string; phone?: string }>;

export default async function TrackOrderPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { order, phone } = await searchParams;
  const orderNumber = order?.trim() ?? "";
  const phoneNumber = phone?.trim() ?? "";
  const hasQuery = orderNumber !== "" || phoneNumber !== "";

  let tracked: TrackedOrder | null = null;
  let queryState: "idle" | "checking" | "not-found" | "unavailable" = "idle";

  if (hasQuery) {
    if (!isServiceConfigured()) {
      queryState = "unavailable";
    } else if (!/^YS-\d{8}-[A-F0-9]{6}$/i.test(orderNumber) || !isValidGhanaPhone(phoneNumber)) {
      queryState = "not-found";
    } else {
      tracked = await trackOrder(orderNumber, phoneNumber);
      queryState = tracked ? "idle" : "not-found";
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:py-16">
      <section className="relative overflow-hidden rounded-lg border border-line bg-navy">
        <Image
          src="/images/retail-editorial.jpg"
          alt=""
          fill
          sizes="(min-width: 768px) 768px, 100vw"
          className="object-cover object-center opacity-40"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-navy via-navy/85 to-navy/90"
        />
        <div className="relative px-6 py-10 text-center lg:py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Order Tracking
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ivory lg:text-4xl">
            Track your order
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ivory/75">
            Enter the order number from your confirmation and the phone number
            used when placing the order.
          </p>
        </div>
      </section>

      <form method="get" className="mx-auto mt-8 max-w-lg">
        <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr_auto]">
          <div>
            <label
              htmlFor="track-order"
              className="block text-xs font-medium uppercase tracking-wider text-ink-soft"
            >
              Order number
            </label>
            <input
              id="track-order"
              name="order"
              type="text"
              required
              autoComplete="off"
              defaultValue={orderNumber}
              placeholder="YS-20260815-A1B2C3"
              className="mt-1.5 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-navy/50 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25"
            />
          </div>
          <div>
            <label
              htmlFor="track-phone"
              className="block text-xs font-medium uppercase tracking-wider text-ink-soft"
            >
              Phone number
            </label>
            <input
              id="track-phone"
              name="phone"
              type="tel"
              inputMode="tel"
              required
              autoComplete="off"
              defaultValue={phoneNumber}
              placeholder="024 412 3456"
              className="mt-1.5 w-full rounded-md border border-line-strong bg-white px-3 py-2 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-navy/50 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25"
            />
          </div>
          <button
            type="submit"
            className="mt-6 inline-flex h-10 items-center rounded-md bg-navy px-5 text-sm font-medium text-ivory transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Track
          </button>
        </div>
      </form>

      {queryState === "unavailable" && (
        <div className="mt-8">
          <RetryPanel
            retryHref="/track"
            message="Order tracking is not available right now. Please try again shortly."
          />
        </div>
      )}

      {queryState === "not-found" && (
        <Card className="mt-8 p-8 text-center lg:p-10">
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
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
              <path d="M8 11h6" />
            </svg>
          </div>
          <h2 className="mt-5 font-display text-xl font-medium tracking-tight text-ink">
            We could not find this order
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
            Check the order number and phone number and try again. If you still
            need help, contact the store with your order number.
          </p>
          <p className="mt-5 text-xs text-ink-faint">
            Signed in?{" "}
            <Link
              href="/account/orders"
              className="font-semibold text-navy hover:text-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              View your orders
            </Link>
          </p>
        </Card>
      )}

      {tracked && <TrackingResult order={tracked} />}
    </div>
  );
}

type TimelineStep = {
  label: string;
  description: string;
  date?: string;
  state: "done" | "current" | "upcoming" | "cancelled";
};

function buildSteps(order: TrackedOrder): TimelineStep[] {
  const { status, paymentStatus } = order;
  const cancelled = status === "cancelled";
  const stateFor = (done: boolean): TimelineStep["state"] =>
    cancelled ? "cancelled" : done ? "done" : "upcoming";

  const hasShipped =
    status === "shipped" ||
    status === "delivered" ||
    order.deliveries.some(
      (delivery) => delivery.status === "shipped" || delivery.status === "delivered",
    );
  const hasDelivered =
    status === "delivered" ||
    order.deliveries.some((delivery) => delivery.deliveredAt !== null);

  const steps: TimelineStep[] = [
    {
      label: "Order placed",
      description: "We received your order and are reviewing it.",
      date: order.createdAt,
      state: cancelled ? "cancelled" : "done",
    },
    {
      label: paymentStatus === "refunded" ? "Payment refunded" : "Payment",
      description:
        paymentStatus === "paid"
          ? "Your payment has been received."
          : paymentStatus === "refunded"
            ? "Your payment has been refunded."
            : paymentStatus === "partially_paid" || paymentStatus === "partially_refunded"
              ? "Part of your payment has been received."
              : "No payment has been taken yet.",
      state: cancelled
        ? "cancelled"
        : paymentStatus === "paid" || paymentStatus === "refunded"
          ? "done"
          : paymentStatus === "partially_paid" || paymentStatus === "partially_refunded"
            ? "current"
            : "upcoming",
    },
    {
      label: "Confirmed & processing",
      description:
        status === "confirmed"
          ? "Your order has been confirmed and is being prepared."
          : status === "processing"
            ? "Your items are being packed for delivery."
            : "We will confirm your order once it is approved.",
      state: stateFor(
        status === "confirmed" || status === "processing" || status === "shipped" || status === "delivered",
      ),
    },
    {
      label: "Shipped",
      description: hasShipped
        ? "Your order is on its way to you."
        : "Your order will be shipped once it is ready.",
      state: stateFor(hasShipped),
    },
    {
      label: "Delivered",
      description: hasDelivered
        ? "Your order has arrived. Enjoy!"
        : "Your order will be delivered to the address you provided.",
      state: stateFor(hasDelivered),
    },
  ];

  if (cancelled) return steps;

  const firstUpcoming = steps.findIndex((step) => step.state === "upcoming");
  return steps.map((step, index) =>
    step.state === "upcoming" && index === firstUpcoming
      ? { ...step, state: "current" }
      : step,
  );
}

function TrackingResult({ order }: { order: TrackedOrder }) {
  const steps = buildSteps(order);
  const cancelled = order.status === "cancelled";

  return (
    <div className="mt-10 space-y-6">
      <Card className="p-6 lg:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-medium tracking-tight text-ink">
              Order <span className="font-mono">{order.orderNumber}</span>
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <StatusBadge tone={orderStatusTone(order.status)}>
            {orderStatusLabel(order.status)}
          </StatusBadge>
        </div>

        {cancelled && (
          <div
            role="alert"
            className="mt-5 rounded-md border border-gold-dark/30 bg-gold-soft px-4 py-3 text-sm leading-6 text-gold-dark"
          >
            This order was cancelled. If you believe this is a mistake, contact
            the store with your order number.
          </div>
        )}

        <ol className="mt-8">
          {steps.map((step, index) => (
            <li key={step.label} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border",
                    step.state === "done" &&
                      "border-navy bg-navy text-ivory",
                    step.state === "current" &&
                      "border-navy bg-white text-navy",
                    step.state === "upcoming" && "border-line-strong bg-line/50 text-ink-faint",
                    step.state === "cancelled" && "border-line-strong bg-line/50 text-ink-faint",
                  )}
                >
                  {step.state === "done" ? (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="h-4 w-4"
                    >
                      <path d="m4 12 5 5L20 6" />
                    </svg>
                  ) : step.state === "current" ? (
                    <span className="h-2.5 w-2.5 rounded-full bg-gold" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-current opacity-40" />
                  )}
                </span>
                {index < steps.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "my-1 w-px flex-1",
                      step.state === "done" || step.state === "current"
                        ? "bg-navy/30"
                        : "bg-line-strong",
                    )}
                  />
                )}
              </div>
              <div className={cn("pb-9", index === steps.length - 1 && "pb-0")}>
                <p
                  className={cn(
                    "text-sm font-medium",
                    step.state === "upcoming" || step.state === "cancelled"
                      ? "text-ink-faint"
                      : "text-ink",
                  )}
                >
                  {step.label}
                  {step.state === "current" && (
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-gold-dark">
                      In progress
                    </span>
                  )}
                </p>
                <p
                  className={cn(
                    "mt-0.5 text-xs leading-5",
                    step.state === "upcoming" || step.state === "cancelled"
                      ? "text-ink-faint"
                      : "text-ink-soft",
                  )}
                >
                  {step.description}
                  {step.date && (
                    <span className="block">
                      {new Date(step.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      {(order.deliveryMethodName || order.deliveries.length > 0) && (
        <Card className="p-6 lg:p-8">
          <h2 className="font-display text-lg font-medium tracking-tight text-ink">
            Delivery
          </h2>
          {order.deliveries.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-ink-soft">
              {order.deliveryMethodName}. Your order will be dispatched once it
              is ready.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {order.deliveries.map((delivery, index) => (
                <li
                  key={index}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-4"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {delivery.methodName}
                    </p>
                    <p className="mt-1 text-xs text-ink-soft">
                      {delivery.carrier && `${delivery.carrier}`}
                      {delivery.trackingReference &&
                        ` · Tracking: ${delivery.trackingReference}`}
                      {delivery.deliveredAt &&
                        ` · Delivered ${new Date(delivery.deliveredAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}`}
                    </p>
                  </div>
                  <StatusBadge tone={deliveryStatusTone(delivery.status)}>
                    {deliveryStatusLabel(delivery.status)}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="p-6 text-center">
        <p className="text-sm leading-6 text-ink-soft">
          Need more details or help with this order?{" "}
          <Link
            href="/login"
            className="font-semibold text-navy hover:text-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Sign in
          </Link>{" "}
          to see the full order, or contact the store with your order number.
        </p>
      </Card>
    </div>
  );
}