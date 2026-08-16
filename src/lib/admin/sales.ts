import { createClient } from "@/lib/supabase/server";

export type AdminOrderRow = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  guestName: string | null;
  channel: string;
  createdAt: string;
  locationId: string | null;
  totalAmount: number;
  paymentStatus: string;
  fulfilmentStatus: string;
  status: string;
};

export async function getOrders({
  q,
  status,
  paymentStatus,
  fulfilmentStatus,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  fulfilmentStatus?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ orders: AdminOrderRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("orders")
    .select(
      "id, order_number, channel, created_at, location_id, total_amount, payment_status, fulfilment_status, status, guest_name, customers(first_name, last_name)",
      { count: "exact" },
    );

  if (q && q.trim() !== "") {
    query = query.or(
      `order_number.ilike.%${q.trim()}%,guest_name.ilike.%${q.trim()}%,guest_email.ilike.%${q.trim()}%`,
    );
  }
  if (status) query = query.eq("status", status);
  if (paymentStatus) query = query.eq("payment_status", paymentStatus);
  if (fulfilmentStatus) query = query.eq("fulfilment_status", fulfilmentStatus);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    order_number: string;
    channel: string;
    created_at: string;
    location_id: string | null;
    total_amount: number;
    payment_status: string;
    fulfilment_status: string;
    status: string;
    guest_name: string | null;
    customers: { first_name: string; last_name: string } | null;
  }[];

  return {
    orders: rows.map((row) => ({
      id: row.id,
      orderNumber: row.order_number,
      customerName: row.customers
        ? `${row.customers.first_name} ${row.customers.last_name}`
        : null,
      guestName: row.guest_name,
      channel: row.channel,
      createdAt: row.created_at,
      locationId: row.location_id,
      totalAmount: Number(row.total_amount),
      paymentStatus: row.payment_status,
      fulfilmentStatus: row.fulfilment_status,
      status: row.status,
    })),
    total: count ?? 0,
  };
}

export type AdminOrderDetail = {
  id: string;
  orderNumber: string;
  channel: string;
  status: string;
  paymentStatus: string;
  fulfilmentStatus: string;
  locationId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  guestEmail: string | null;
  billToRecipient: string | null;
  billToPhone: string | null;
  billToAddressLine1: string | null;
  billToAddressLine2: string | null;
  billToCity: string | null;
  billToRegion: string | null;
  deliveryMethodName: string | null;
  deliveryFee: number;
  deliveryRecipient: string | null;
  deliveryPhone: string | null;
  deliveryAddressLine1: string | null;
  deliveryAddressLine2: string | null;
  deliveryCity: string | null;
  deliveryRegion: string | null;
  subtotal: number;
  discountTotal: number;
  taxAmount: number;
  taxRate: number | null;
  totalAmount: number;
  notes: string | null;
  createdAt: string;
  customer: {
    id: string;
    customerCode: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  } | null;
  items: {
    productName: string;
    variantName: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    lineTotal: number;
    taxAmount: number;
  }[];
  deliveries: {
    methodName: string;
    status: string;
    carrier: string | null;
    trackingReference: string | null;
    deliveredAt: string | null;
  }[];
  payments: {
    id: string;
    method: string;
    amount: number;
    status: string;
    paymentDate: string;
    reference: string | null;
    provider: string | null;
    providerReference: string | null;
  }[];
};

export async function getOrderByNumber(orderNumber: string): Promise<AdminOrderDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("orders")
    .select(
      `
      id, order_number, channel, status, payment_status, fulfilment_status, location_id,
      guest_name, guest_phone, guest_email,
      bill_to_recipient, bill_to_phone, bill_to_address_line_1, bill_to_address_line_2,
      bill_to_city, bill_to_region,
      delivery_method_name, delivery_fee, delivery_recipient, delivery_phone,
      delivery_address_line_1, delivery_address_line_2, delivery_city, delivery_region,
      subtotal, discount_total, tax_amount, tax_rate, total_amount, notes, created_at,
      customers(id, customer_code, first_name, last_name, phone, email),
      order_items(product_name, variant_name, sku, quantity, unit_price, discount_amount, line_total, tax_amount),
      deliveries(method_name, status, carrier, tracking_reference, delivered_at),
      payments(id, method, amount, status, payment_date, reference, provider, provider_reference)
    `,
    )
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    order_number: string;
    channel: string;
    status: string;
    payment_status: string;
    fulfilment_status: string;
    location_id: string | null;
    guest_name: string | null;
    guest_phone: string | null;
    guest_email: string | null;
    bill_to_recipient: string | null;
    bill_to_phone: string | null;
    bill_to_address_line_1: string | null;
    bill_to_address_line_2: string | null;
    bill_to_city: string | null;
    bill_to_region: string | null;
    delivery_method_name: string | null;
    delivery_fee: number;
    delivery_recipient: string | null;
    delivery_phone: string | null;
    delivery_address_line_1: string | null;
    delivery_address_line_2: string | null;
    delivery_city: string | null;
    delivery_region: string | null;
    subtotal: number;
    discount_total: number;
    tax_amount: number;
    tax_rate: number | null;
    total_amount: number;
    notes: string | null;
    created_at: string;
    customers: {
      id: string;
      customer_code: string;
      first_name: string;
      last_name: string;
      phone: string;
      email: string | null;
    } | null;
    order_items: {
      product_name: string;
      variant_name: string;
      sku: string;
      quantity: number;
      unit_price: number;
      discount_amount: number;
      line_total: number;
      tax_amount: number;
    }[];
    deliveries: {
      method_name: string;
      status: string;
      carrier: string | null;
      tracking_reference: string | null;
      delivered_at: string | null;
    }[];
    payments: {
      id: string;
      method: string;
      amount: number;
      status: string;
      payment_date: string;
      reference: string | null;
      provider: string | null;
      provider_reference: string | null;
    }[];
  };

  return {
    id: row.id,
    orderNumber: row.order_number,
    channel: row.channel,
    status: row.status,
    paymentStatus: row.payment_status,
    fulfilmentStatus: row.fulfilment_status,
    locationId: row.location_id,
    guestName: row.guest_name,
    guestPhone: row.guest_phone,
    guestEmail: row.guest_email,
    billToRecipient: row.bill_to_recipient,
    billToPhone: row.bill_to_phone,
    billToAddressLine1: row.bill_to_address_line_1,
    billToAddressLine2: row.bill_to_address_line_2,
    billToCity: row.bill_to_city,
    billToRegion: row.bill_to_region,
    deliveryMethodName: row.delivery_method_name,
    deliveryFee: Number(row.delivery_fee),
    deliveryRecipient: row.delivery_recipient,
    deliveryPhone: row.delivery_phone,
    deliveryAddressLine1: row.delivery_address_line_1,
    deliveryAddressLine2: row.delivery_address_line_2,
    deliveryCity: row.delivery_city,
    deliveryRegion: row.delivery_region,
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    taxAmount: Number(row.tax_amount),
    taxRate: row.tax_rate === null ? null : Number(row.tax_rate),
    totalAmount: Number(row.total_amount),
    notes: row.notes,
    createdAt: row.created_at,
    customer: row.customers
      ? {
          id: row.customers.id,
          customerCode: row.customers.customer_code,
          firstName: row.customers.first_name,
          lastName: row.customers.last_name,
          phone: row.customers.phone,
          email: row.customers.email,
        }
      : null,
    items: (row.order_items ?? []).map((item) => ({
      productName: item.product_name,
      variantName: item.variant_name,
      sku: item.sku,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      discountAmount: Number(item.discount_amount),
      lineTotal: Number(item.line_total),
      taxAmount: Number(item.tax_amount),
    })),
    deliveries: (row.deliveries ?? []).map((delivery) => ({
      methodName: delivery.method_name,
      status: delivery.status,
      carrier: delivery.carrier,
      trackingReference: delivery.tracking_reference,
      deliveredAt: delivery.delivered_at,
    })),
    payments: (row.payments ?? []).map((payment) => ({
      id: payment.id,
      method: payment.method,
      amount: Number(payment.amount),
      status: payment.status,
      paymentDate: payment.payment_date,
      reference: payment.reference,
      provider: payment.provider,
      providerReference: payment.provider_reference,
    })),
  };
}