import { isServiceConfigured, createServiceClient } from "@/lib/supabase/service";
import { normalizeGhanaPhone } from "@/lib/format";

export type TrackedOrder = {
  orderNumber: string;
  createdAt: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  deliveryMethodName: string | null;
  deliveries: {
    methodName: string;
    status: string;
    carrier: string | null;
    trackingReference: string | null;
    deliveredAt: string | null;
  }[];
};

/**
 * Look up an order for the public tracking page.
 *
 * Guests may only see an order when they know BOTH the order number and a
 * phone number used on the order (guest, billing or delivery). Matching is
 * normalized so "0244 123 456" and "+233244123456" are equivalent. Only
 * tracking-safe fields are returned — never customer addresses or totals.
 */
export async function trackOrder(
  orderNumber: string,
  phone: string,
): Promise<TrackedOrder | null> {
  if (!isServiceConfigured()) return null;
  const client = createServiceClient();

  const { data, error } = await client
    .from("orders")
    .select(
      `
      order_number, created_at, status, payment_status, fulfilment_status,
      delivery_method_name,
      guest_phone, bill_to_phone, delivery_phone,
      deliveries(method_name, status, carrier, tracking_reference, delivered_at)
    `,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as {
    order_number: string;
    created_at: string;
    status: string;
    payment_status: string;
    fulfilment_status: string;
    delivery_method_name: string | null;
    guest_phone: string | null;
    bill_to_phone: string | null;
    delivery_phone: string | null;
    deliveries: {
      method_name: string;
      status: string;
      carrier: string | null;
      tracking_reference: string | null;
      delivered_at: string | null;
    }[];
  };

  const normalized = normalizeGhanaPhone(phone);
  const phones = [row.guest_phone, row.bill_to_phone, row.delivery_phone]
    .filter((value): value is string => value !== null && value !== "")
    .map(normalizeGhanaPhone);

  if (normalized === "" || !phones.includes(normalized)) {
    return null;
  }

  return {
    orderNumber: row.order_number,
    createdAt: row.created_at,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfilmentStatus: row.fulfilment_status,
    deliveryMethodName: row.delivery_method_name,
    deliveries: (row.deliveries ?? []).map((delivery) => ({
      methodName: delivery.method_name,
      status: delivery.status,
      carrier: delivery.carrier,
      trackingReference: delivery.tracking_reference,
      deliveredAt: delivery.delivered_at,
    })),
  };
}