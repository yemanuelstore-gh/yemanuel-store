import { createClient } from "@/lib/supabase/server";

export type ReturnRow = {
  id: string;
  returnNumber: string;
  orderNumber: string;
  status: string;
  reason: string;
  returnDate: string;
  itemCount: number;
  refundTotal: number;
};

export async function getReturns({
  page = 1,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{ returns: ReturnRow[]; total: number }> {
  const client = await createClient();
  const { data, count } = await client
    .from("returns")
    .select(
      "id, return_number, status, reason, created_at, orders(order_number), return_items(quantity_returned, refund_amount)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    return_number: string;
    status: string;
    reason: string;
    created_at: string;
    orders: { order_number: string } | null;
    return_items: { quantity_returned: number; refund_amount: number | null }[];
  }[];

  return {
    returns: rows.map((row) => ({
      id: row.id,
      returnNumber: row.return_number,
      orderNumber: row.orders?.order_number ?? "—",
      status: row.status,
      reason: row.reason,
      returnDate: row.created_at,
      itemCount: (row.return_items ?? []).reduce(
        (sum, item) => sum + Number(item.quantity_returned),
        0,
      ),
      refundTotal: (row.return_items ?? []).reduce(
        (sum, item) => sum + Number(item.refund_amount ?? 0),
        0,
      ),
    })),
    total: count ?? 0,
  };
}

export type ReturnDetail = {
  id: string;
  returnNumber: string;
  orderId: string;
  orderNumber: string;
  status: string;
  reason: string;
  reasonNote: string | null;
  createdAt: string;
  items: {
    id: string;
    variantName: string;
    sku: string;
    quantityReturned: number;
    condition: string;
    refundAmount: number | null;
  }[];
  refunds: { id: string; refundNumber: string; amount: number; status: string }[];
};

export async function getReturnById(id: string): Promise<ReturnDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("returns")
    .select(
      "id, return_number, order_id, status, reason, reason_note, created_at, orders(order_number), return_items(id, quantity_returned, condition, refund_amount, product_variants(name, sku)), refunds(id, refund_number, amount, status)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    return_number: string;
    order_id: string;
    status: string;
    reason: string;
    reason_note: string | null;
    created_at: string;
    orders: { order_number: string } | null;
    return_items: {
      id: string;
      quantity_returned: number;
      condition: string;
      refund_amount: number | null;
      product_variants: { name: string; sku: string } | null;
    }[];
    refunds: { id: string; refund_number: string; amount: number; status: string }[];
  };

  return {
    id: row.id,
    returnNumber: row.return_number,
    orderId: row.order_id,
    orderNumber: row.orders?.order_number ?? "—",
    status: row.status,
    reason: row.reason,
    reasonNote: row.reason_note,
    createdAt: row.created_at,
    items: (row.return_items ?? []).map((item) => ({
      id: item.id,
      variantName: item.product_variants?.name ?? "—",
      sku: item.product_variants?.sku ?? "—",
      quantityReturned: Number(item.quantity_returned),
      condition: item.condition,
      refundAmount: item.refund_amount !== null ? Number(item.refund_amount) : null,
    })),
    refunds: (row.refunds ?? []).map((refund) => ({
      id: refund.id,
      refundNumber: refund.refund_number,
      amount: Number(refund.amount),
      status: refund.status,
    })),
  };
}

export type RefundRow = {
  id: string;
  refundNumber: string;
  orderNumber: string;
  amount: number;
  method: string;
  status: string;
  refundDate: string;
  reference: string | null;
  paymentReference: string | null;
};

export async function getRefunds({
  page = 1,
  pageSize = 25,
}: {
  page?: number;
  pageSize?: number;
}): Promise<{ refunds: RefundRow[]; total: number }> {
  const client = await createClient();
  const { data, count } = await client
    .from("refunds")
    .select(
      "id, refund_number, amount, method, status, created_at, reference, orders(order_number), payments(reference)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    refund_number: string;
    amount: number;
    method: string;
    status: string;
    created_at: string;
    reference: string | null;
    orders: { order_number: string } | null;
    payments: { reference: string | null } | null;
  }[];

  return {
    refunds: rows.map((row) => ({
      id: row.id,
      refundNumber: row.refund_number,
      orderNumber: row.orders?.order_number ?? "—",
      amount: Number(row.amount),
      method: row.method,
      status: row.status,
      refundDate: row.created_at,
      reference: row.reference,
      paymentReference: row.payments?.reference ?? null,
    })),
    total: count ?? 0,
  };
}

export type RefundDetail = {
  id: string;
  refundNumber: string;
  orderId: string;
  orderNumber: string;
  returnNumber: string | null;
  paymentReference: string | null;
  amount: number;
  method: string;
  status: string;
  reference: string | null;
  reason: string | null;
  createdAt: string;
};

export async function getRefundById(id: string): Promise<RefundDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("refunds")
    .select(
      "id, refund_number, order_id, amount, method, status, reference, reason, created_at, orders(order_number), returns(return_number), payments(reference)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    refund_number: string;
    order_id: string;
    amount: number;
    method: string;
    status: string;
    reference: string | null;
    reason: string | null;
    created_at: string;
    orders: { order_number: string } | null;
    returns: { return_number: string } | null;
    payments: { reference: string | null } | null;
  };

  return {
    id: row.id,
    refundNumber: row.refund_number,
    orderId: row.order_id,
    orderNumber: row.orders?.order_number ?? "—",
    returnNumber: row.returns?.return_number ?? null,
    paymentReference: row.payments?.reference ?? null,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    reference: row.reference,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export type OrderForSelect = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  status: string;
};

export async function getOrdersForSelect(): Promise<OrderForSelect[]> {
  const client = await createClient();
  const { data } = await client
    .from("orders")
    .select("id, order_number, status, customers(name)")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as {
    id: string;
    order_number: string;
    status: string;
    customers: { name: string } | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customers?.name ?? null,
    status: row.status,
  }));
}

export type OrderItemForSelect = {
  id: string;
  variantId: string;
  variantName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
};

export async function getOrderItemsForSelect(orderId: string): Promise<OrderItemForSelect[]> {
  const client = await createClient();
  const { data } = await client
    .from("order_items")
    .select("id, variant_id, quantity, unit_price, product_variants(name, sku)")
    .eq("order_id", orderId);

  const rows = (data ?? []) as unknown as {
    id: string;
    variant_id: string;
    quantity: number;
    unit_price: number;
    product_variants: { name: string; sku: string } | null;
  }[];

  return rows.map((row) => ({
    id: row.id,
    variantId: row.variant_id,
    variantName: row.product_variants?.name ?? "—",
    sku: row.product_variants?.sku ?? "—",
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
  }));
}

export async function getReturnsForSelect(): Promise<{ id: string; returnNumber: string }[]> {
  const client = await createClient();
  const { data } = await client
    .from("returns")
    .select("id, return_number")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as { id: string; return_number: string }[];
  return rows.map((row) => ({ id: row.id, returnNumber: row.return_number }));
}