import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/card";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { StatusBadge } from "@/components/storefront/status-badge";
import { ProductImage } from "@/components/storefront/product-image";
import { getAccountData } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { formatGHS, formatGhanaPhone } from "@/lib/format";
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

type Props = {
  params: Promise<{ orderNumber: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber} — Yemanuel Store`,
  };
}

type OrderDetailData = {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  taxRate: number | null;
  deliveryFee: number;
  totalAmount: number;
  deliveryMethodName: string | null;
  deliveryRecipient: string | null;
  deliveryPhone: string | null;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryCity: string | null;
  deliveryRegion: string | null;
  billToRecipient: string | null;
  billToPhone: string | null;
  billToAddressLine1: string | null;
  billToAddressLine2: string | null;
  billToCity: string | null;
  billToRegion: string | null;
  notes: string | null;
  items: {
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    imageUrl: string | null;
  }[];
  deliveries: {
    methodName: string;
    status: string;
    carrier: string | null;
    trackingReference: string | null;
    deliveredAt: string | null;
  }[];
  payments: {
    method: string;
    amount: number;
    status: string;
    paymentDate: string;
  }[];
};

export default async function OrderDetailPage({ params }: Props) {
  const account = await getAccountData();
  if (!account || !account.customer) return null;

  const { orderNumber } = await params;

  let order: OrderDetailData | null = null;
  let failed = false;
  try {
    const client = await createClient();
    const { data, error } = await client
      .from("orders")
      .select(
        `
        order_number, created_at, status, payment_status, fulfilment_status,
        subtotal, discount_total, tax_amount, tax_rate, delivery_fee, total_amount,
        delivery_method_name, delivery_recipient, delivery_phone,
        delivery_address_line_1, delivery_address_line_2, delivery_city, delivery_region,
        bill_to_recipient, bill_to_phone, bill_to_address_line_1, bill_to_address_line_2,
        bill_to_city, bill_to_region, notes,
        order_items(product_name, variant_name, sku, quantity, unit_price, line_total, variant_id:product_variants(product_images(url, is_primary))),
        deliveries(method_name, status, carrier, tracking_reference, delivered_at),
        payments(method, amount, status, payment_date)
      `,
      )
      .eq("order_number", orderNumber)
      .eq("customer_id", account.customer.id)
      .maybeSingle();
    if (error) {
      failed = true;
    } else if (data) {
      const row = data as unknown as {
        order_number: string;
        created_at: string;
        status: string;
        payment_status: string;
        fulfilment_status: string;
        subtotal: string;
        discount_total: string;
        tax_amount: string;
        tax_rate: string | null;
        delivery_fee: string;
        total_amount: string;
        delivery_method_name: string | null;
        delivery_recipient: string | null;
        delivery_phone: string | null;
        delivery_address_line_1: string | null;
        delivery_address_line_2: string | null;
        delivery_city: string | null;
        delivery_region: string | null;
        bill_to_recipient: string | null;
        bill_to_phone: string | null;
        bill_to_address_line_1: string | null;
        bill_to_address_line_2: string | null;
        bill_to_city: string | null;
        bill_to_region: string | null;
        notes: string | null;
        order_items: {
          product_name: string;
          variant_name: string;
          sku: string;
          quantity: number;
          unit_price: string;
          line_total: string;
          product_variants: {
            product_images: { url: string; is_primary: boolean }[] | null;
          } | null;
        }[];
        deliveries: {
          method_name: string;
          status: string;
          carrier: string | null;
          tracking_reference: string | null;
          delivered_at: string | null;
        }[];
        payments: {
          method: string;
          amount: string;
          status: string;
          payment_date: string;
        }[];
      };
      order = {
        orderNumber: row.order_number,
        createdAt: row.created_at,
        status: row.status,
        paymentStatus: row.payment_status,
        fulfilmentStatus: row.fulfilment_status,
        subtotal: Number(row.subtotal),
        discountTotal: Number(row.discount_total),
        taxAmount: Number(row.tax_amount),
        taxRate: row.tax_rate === null ? null : Number(row.tax_rate),
        deliveryFee: Number(row.delivery_fee),
        totalAmount: Number(row.total_amount),
        deliveryMethodName: row.delivery_method_name,
        deliveryRecipient: row.delivery_recipient,
        deliveryPhone: row.delivery_phone,
        deliveryAddressLine1: row.delivery_address_line_1,
        deliveryAddressLine2: row.delivery_address_line_2,
        deliveryCity: row.delivery_city,
        deliveryRegion: row.delivery_region,
        billToRecipient: row.bill_to_recipient,
        billToPhone: row.bill_to_phone,
        billToAddressLine1: row.bill_to_address_line_1,
        billToAddressLine2: row.bill_to_address_line_2,
        billToCity: row.bill_to_city,
        billToRegion: row.bill_to_region,
        notes: row.notes,
        items: (row.order_items ?? []).map((item) => {
          const images = item.product_variants?.product_images;
          const primaryImage =
            images?.find((image) => image.is_primary) ?? images?.[0] ?? null;
          return {
            productName: item.product_name,
            variantName: item.variant_name,
            sku: item.sku,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            lineTotal: Number(item.line_total),
            imageUrl: primaryImage?.url ?? null,
          };
        }),
        deliveries: (row.deliveries ?? []).map((delivery) => ({
          methodName: delivery.method_name,
          status: delivery.status,
          carrier: delivery.carrier,
          trackingReference: delivery.tracking_reference,
          deliveredAt: delivery.delivered_at,
        })),
        payments: (row.payments ?? []).map((payment) => ({
          method: payment.method,
          amount: Number(payment.amount),
          status: payment.status,
          paymentDate: payment.payment_date,
        })),
      };
    }
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <RetryPanel
        retryHref={`/account/orders/${orderNumber}`}
        message="We could not load this order. Please try again."
      />
    );
  }

  if (!order) notFound();

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/account/orders"
          className="text-sm text-ink-soft transition-colors hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
        >
          ← All orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
              Order {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Placed on{" "}
              {new Date(order.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={orderStatusTone(order.status)}>
              {orderStatusLabel(order.status)}
            </StatusBadge>
            <StatusBadge tone={paymentStatusTone(order.paymentStatus)}>
              {paymentStatusLabel(order.paymentStatus)}
            </StatusBadge>
            <StatusBadge tone={fulfilmentStatusTone(order.fulfilmentStatus)}>
              {fulfilmentStatusLabel(order.fulfilmentStatus)}
            </StatusBadge>
          </div>
        </div>
      </div>

      <Card className="p-6 lg:p-8">
        <h2 className="font-display text-lg font-medium tracking-tight text-ink">
          Items
        </h2>
        <ul className="mt-5 divide-y divide-line border-t border-line">
          {order.items.map((item, index) => (
            <li key={`${item.sku}-${index}`} className="flex justify-between gap-4 py-4">
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
                  <p className="mt-0.5 text-xs leading-5 text-ink-soft">
                    {item.variantName}
                    {item.sku && ` · SKU ${item.sku}`}
                  </p>
                </div>
              </div>
              <div className="flex-shrink-0 text-right text-sm">
                <p className="text-ink-soft">
                  {item.quantity} × {formatGHS(item.unitPrice)}
                </p>
                <p className="mt-0.5 font-semibold text-ink">
                  {formatGHS(item.lineTotal)}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <dl className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-semibold text-ink">{formatGHS(order.subtotal)}</dd>
          </div>
          {order.discountTotal > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-ink-soft">Discount</dt>
              <dd className="font-semibold text-ink">
                −{formatGHS(order.discountTotal)}
              </dd>
            </div>
          )}
          {order.taxAmount > 0 && (
            <div className="flex items-center justify-between">
              <dt className="text-ink-soft">
                Tax{order.taxRate !== null ? ` (${order.taxRate}%)` : ""}
              </dt>
              <dd className="font-semibold text-ink">{formatGHS(order.taxAmount)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between">
            <dt className="text-ink-soft">
              Delivery{order.deliveryMethodName ? ` (${order.deliveryMethodName})` : ""}
            </dt>
            <dd className="font-semibold text-ink">{formatGHS(order.deliveryFee)}</dd>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-3">
            <dt className="font-medium text-ink">Total</dt>
            <dd className="text-lg font-semibold text-ink">
              {formatGHS(order.totalAmount)}
            </dd>
          </div>
        </dl>
      </Card>

      {order.deliveries.length > 0 && (
        <Card className="p-6 lg:p-8">
          <h2 className="font-display text-lg font-medium tracking-tight text-ink">
            Delivery
          </h2>
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
        </Card>
      )}

      {order.payments.length > 0 && (
        <Card className="p-6 lg:p-8">
          <h2 className="font-display text-lg font-medium tracking-tight text-ink">
            Payments
          </h2>
          <ul className="mt-4 space-y-3">
            {order.payments.map((payment, index) => (
              <li
                key={index}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line p-4"
              >
                <div>
                  <p className="text-sm font-medium text-ink capitalize">
                    {payment.method.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-xs text-ink-soft">
                    {new Date(payment.paymentDate).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-ink">
                    {formatGHS(payment.amount)}
                  </span>
                  <StatusBadge tone={paymentStatusTone(payment.status)}>
                    {paymentStatusLabel(payment.status)}
                  </StatusBadge>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6 lg:p-8">
          <h2 className="font-display text-lg font-medium tracking-tight text-ink">
            Delivery information
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Recipient</dt>
              <dd className="text-right font-medium text-ink">
                {order.deliveryRecipient ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Phone</dt>
              <dd className="text-right font-medium text-ink">
                {order.deliveryPhone ? formatGhanaPhone(order.deliveryPhone) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Address</dt>
              <dd className="text-right font-medium text-ink">
                {order.deliveryAddressLine1 ?? "—"}
                {order.deliveryAddressLine2
                  ? `, ${order.deliveryAddressLine2}`
                  : ""}
                {order.deliveryCity &&
                  `, ${order.deliveryCity}, ${order.deliveryRegion ?? ""}`}
              </dd>
            </div>
          </dl>
        </Card>

        <Card className="p-6 lg:p-8">
          <h2 className="font-display text-lg font-medium tracking-tight text-ink">
            Billing information
          </h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Bill to</dt>
              <dd className="text-right font-medium text-ink">
                {order.billToRecipient ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Phone</dt>
              <dd className="text-right font-medium text-ink">
                {order.billToPhone ? formatGhanaPhone(order.billToPhone) : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-ink-soft">Address</dt>
              <dd className="text-right font-medium text-ink">
                {order.billToAddressLine1 ?? "—"}
                {order.billToAddressLine2
                  ? `, ${order.billToAddressLine2}`
                  : ""}
                {order.billToCity && `, ${order.billToCity}, ${order.billToRegion ?? ""}`}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {order.notes && (
        <Card className="p-6">
          <h2 className="font-display text-lg font-medium tracking-tight text-ink">
            Notes
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft">{order.notes}</p>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="inline-flex h-10 items-center rounded-md bg-navy px-5 text-sm font-medium text-ivory transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Continue shopping
        </Link>
        <Link
          href="/account/orders"
          className="inline-flex h-10 items-center rounded-md border border-line-strong bg-white px-5 text-sm font-medium text-ink transition-colors hover:bg-navy-soft/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          All orders
        </Link>
      </div>
    </div>
  );
}