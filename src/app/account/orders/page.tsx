import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { ProductImage } from "@/components/storefront/product-image";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { StatusBadge } from "@/components/storefront/status-badge";
import { getAccountData } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { formatGHS } from "@/lib/format";
import {
  deliveryStatusLabel,
  deliveryStatusTone,
  fulfilmentStatusLabel,
  fulfilmentStatusTone,
  orderStatusLabel,
  orderStatusTone,
  paymentStatusLabel,
  paymentStatusTone,
} from "@/lib/status";

export const metadata: Metadata = {
  title: "Your Orders — Yemanuel Store",
};

type OrderListItem = {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  totalAmount: number;
  itemCount: number;
  deliveryStatus: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
};

export default async function OrdersPage() {
  const account = await getAccountData();
  if (!account || !account.customer) return null;

  let orders: OrderListItem[] = [];
  let failed = false;
  try {
    const client = await createClient();
    const { data, error } = await client
      .from("orders")
      .select(
        `
        order_number, created_at, status, payment_status, fulfilment_status,
        total_amount,
        order_items(quantity, product_name, variant_id:product_variants(product_images(url, is_primary))),
        deliveries(status)
      `,
      )
      .eq("customer_id", account.customer.id)
      .order("created_at", { ascending: false });
    if (error) {
      failed = true;
    } else {
      orders = ((data ?? []) as unknown as {
        order_number: string;
        created_at: string;
        status: string;
        payment_status: string;
        fulfilment_status: string;
        total_amount: string;
        order_items: {
          quantity: number;
          product_name: string;
          product_variants: {
            product_images: { url: string; is_primary: boolean }[] | null;
          } | null;
        }[];
        deliveries: { status: string }[] | null;
      }[]).map((row) => {
        const firstItem = (row.order_items ?? [])[0];
        const images = firstItem?.product_variants?.product_images;
        const primaryImage =
          images?.find((image) => image.is_primary) ?? images?.[0] ?? null;
        return {
          orderNumber: row.order_number,
          createdAt: row.created_at,
          status: row.status,
          paymentStatus: row.payment_status,
          fulfilmentStatus: row.fulfilment_status,
          totalAmount: Number(row.total_amount),
          itemCount: (row.order_items ?? []).reduce(
            (total, item) => total + Number(item.quantity),
            0,
          ),
          deliveryStatus:
            row.deliveries && row.deliveries.length > 0
              ? row.deliveries[0].status
              : null,
          imageUrl: primaryImage?.url ?? null,
          imageAlt: firstItem?.product_name ?? null,
        };
      });
    }
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <RetryPanel
        retryHref="/account/orders"
        message="We could not load your orders. Please try again."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-medium tracking-tight text-ink">
          Your orders
        </h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">
          Track your recent orders from Yemanuel Store.
        </p>
      </div>

      {orders.length === 0 ? (
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
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <h2 className="mt-5 font-display text-xl font-medium tracking-tight text-ink">
            No orders yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
            When you place an order, it will appear here with its status,
            payment and delivery progress.
          </p>
          <Link
            href="/shop"
            className="mt-7 inline-flex h-10 items-center rounded-md bg-navy px-5 text-sm font-medium text-ivory transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            Browse the shop
          </Link>
        </Card>
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {orders.map((order) => (
            <li key={order.orderNumber} className="py-5">
              <Link
                href={`/account/orders/${order.orderNumber}`}
                className="group block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                <div className="flex items-center gap-4">
                  <span className="relative h-16 w-12 flex-shrink-0 overflow-hidden rounded-md border border-line bg-navy-soft">
                    <ProductImage
                      src={order.imageUrl}
                      alt={order.imageAlt ?? order.orderNumber}
                      sizes="48px"
                      fallbackLetter={order.imageAlt?.charAt(0) ?? "Y"}
                      className="h-full w-full object-cover"
                    />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-6 gap-y-3">
                    <div>
                      <p className="text-sm font-semibold text-ink transition-colors group-hover:text-navy">
                        {order.orderNumber}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {new Date(order.createdAt).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                        {" · "}
                        {order.itemCount} {order.itemCount === 1 ? "item" : "items"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge tone={orderStatusTone(order.status)}>
                        {orderStatusLabel(order.status)}
                      </StatusBadge>
                      <StatusBadge tone={paymentStatusTone(order.paymentStatus)}>
                        {paymentStatusLabel(order.paymentStatus)}
                      </StatusBadge>
                      <StatusBadge tone={fulfilmentStatusTone(order.fulfilmentStatus)}>
                        {fulfilmentStatusLabel(order.fulfilmentStatus)}
                      </StatusBadge>
                      {order.deliveryStatus && (
                        <StatusBadge tone={deliveryStatusTone(order.deliveryStatus)}>
                          {deliveryStatusLabel(order.deliveryStatus)}
                        </StatusBadge>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-ink">
                      {formatGHS(order.totalAmount)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}