import { createClient } from "@/lib/supabase/server";
import {
  agingBucketFor,
  ageInDays,
  fetchAllPaged,
  reportRpc,
  take,
  type AgingBucket,
} from "@/lib/admin/reporting";

/**
 * Receivables data layer.
 *
 * Mirrors app.dashboard_receivables() exactly: an order is receivable when
 * it is not cancelled and its payment status is unpaid or partially paid;
 * the paid amount is the sum of its payments in paid/authorized status;
 * outstanding = total - paid. Orders carry no due date, so aging is measured
 * from the order date (the UI states this explicitly).
 */

export type ReceivableOrderRow = {
  orderId: string;
  orderNumber: string;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  createdAt: string;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  ageDays: number;
  agingBucket: AgingBucket;
};

const OUTSTANDING_STATUSES = ["unpaid", "partially_paid"] as const;

export async function getReceivablesPage({
  q,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: ReceivableOrderRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("orders")
    .select(
      "id, order_number, created_at, total_amount, payment_status, guest_name, customers(id, first_name, last_name, phone)",
      { count: "exact" },
    )
    .in("payment_status", OUTSTANDING_STATUSES)
    .neq("status", "cancelled");

  if (q && q.trim() !== "") {
    const term = q.trim();
    query = query.or(`order_number.ilike.%${term}%,guest_name.ilike.%${term}%`);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    order_number: string;
    created_at: string;
    total_amount: number;
    guest_name: string | null;
    customers: { id: string; first_name: string; last_name: string; phone: string } | null;
  }[];

  const paidByOrder = new Map<string, number>();
  const orderIds = rows.map((row) => row.id);
  if (orderIds.length > 0) {
    const { data: payments } = await client
      .from("payments")
      .select("order_id, amount, status")
      .in("order_id", orderIds);
    for (const payment of payments ?? []) {
      if (payment.status === "paid" || payment.status === "authorized") {
        paidByOrder.set(
          payment.order_id,
          (paidByOrder.get(payment.order_id) ?? 0) + Number(payment.amount),
        );
      }
    }
  }

  const now = new Date();
  const mapped = rows.map((row) => {
    const total = Number(row.total_amount);
    const paid = paidByOrder.get(row.id) ?? 0;
    const customer = row.customers;
    return {
      orderId: row.id,
      orderNumber: row.order_number,
      customerId: customer?.id ?? null,
      customerName: customer
        ? `${customer.first_name} ${customer.last_name}`
        : (row.guest_name ?? "Guest"),
      customerPhone: customer?.phone ?? null,
      createdAt: row.created_at,
      totalAmount: total,
      paidAmount: paid,
      outstanding: Math.max(0, total - paid),
      ageDays: ageInDays(row.created_at, now),
      agingBucket: agingBucketFor(ageInDays(row.created_at, now)),
    };
  });

  return { rows: mapped, total: count ?? 0 };
}

export type ReceivablesSummary = {
  totalOutstanding: number;
  openOrderCount: number;
  customerCount: number;
  largestBalance: number;
  aging: { bucket: AgingBucket; count: number; outstanding: number }[];
};

export async function getReceivablesSummary(): Promise<ReceivablesSummary | null> {
  const client = await createClient();
  const [rpcResult, countResult] = await Promise.all([
    reportRpc<{ customer_name: string; order_count: number; outstanding: number }[]>(
      "dashboard_receivables",
      {},
    ),
    client
      .from("orders")
      .select("id", { count: "exact", head: true })
      .in("payment_status", OUTSTANDING_STATUSES)
      .neq("status", "cancelled"),
  ]);

  const customers = take(rpcResult);
  if (!customers) return null;

  const now = new Date();
  const [orders, payments] = await Promise.all([
    fetchAllPaged<{ id: string; created_at: string; total_amount: number }>((from, to) =>
      client
        .from("orders")
        .select("id, created_at, total_amount")
        .in("payment_status", OUTSTANDING_STATUSES)
        .neq("status", "cancelled")
        .range(from, to),
    ),
    fetchAllPaged<{
      order_id: string;
      amount: number;
      status: string;
      orders: { created_at: string; total_amount: number }[] | null;
    }>((from, to) =>
      client
        .from("payments")
        .select("order_id, amount, status, orders!inner(created_at, total_amount)")
        .in("orders.payment_status", OUTSTANDING_STATUSES)
        .neq("orders.status", "cancelled")
        .range(from, to),
    ),
  ]);

  const byOrder = new Map<string, { createdAt: string; total: number; paid: number }>();
  for (const order of orders) {
    byOrder.set(order.id, {
      createdAt: order.created_at,
      total: Number(order.total_amount),
      paid: 0,
    });
  }
  for (const payment of payments) {
    if (payment.status !== "paid" && payment.status !== "authorized") continue;
    const current = byOrder.get(payment.order_id);
    if (!current) continue;
    current.paid += Number(payment.amount);
  }

  const aging = new Map<AgingBucket, { count: number; outstanding: number }>();
  for (const order of byOrder.values()) {
    const bucket = agingBucketFor(ageInDays(order.createdAt, now));
    const current = aging.get(bucket) ?? { count: 0, outstanding: 0 };
    current.count += 1;
    current.outstanding += Math.max(0, order.total - order.paid);
    aging.set(bucket, current);
  }

  return {
    totalOutstanding: customers.reduce((sum, row) => sum + Number(row.outstanding), 0),
    openOrderCount: countResult.count ?? 0,
    customerCount: customers.length,
    largestBalance: customers.reduce(
      (max, row) => Math.max(max, Number(row.outstanding)),
      0,
    ),
    aging: (
      ["current", "days_31_60", "days_61_90", "over_90"] as AgingBucket[]
    ).map((bucket) => ({
      bucket,
      count: aging.get(bucket)?.count ?? 0,
      outstanding: aging.get(bucket)?.outstanding ?? 0,
    })),
  };
}

export type CustomerReceivables = {
  customer: {
    id: string;
    customerCode: string;
    firstName: string;
    lastName: string;
    businessName: string | null;
    phone: string;
    email: string | null;
    status: string;
  } | null;
  rows: ReceivableOrderRow[];
};

export async function getCustomerReceivables(
  customerId: string,
): Promise<CustomerReceivables | null> {
  const client = await createClient();
  const [customerResult, ordersResult] = await Promise.all([
    client
      .from("customers")
      .select(
        "id, customer_code, first_name, last_name, business_name, phone, email, status",
      )
      .eq("id", customerId)
      .maybeSingle(),
    client
      .from("orders")
      .select("id, order_number, created_at, total_amount, guest_name")
      .eq("customer_id", customerId)
      .in("payment_status", OUTSTANDING_STATUSES)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false }),
  ]);

  if (customerResult.error) return null;

  const rawCustomer = (customerResult.data ?? null) as {
    id: string;
    customer_code: string;
    first_name: string;
    last_name: string;
    business_name: string | null;
    phone: string;
    email: string | null;
    status: string;
  } | null;

  const customer = rawCustomer
    ? {
        id: rawCustomer.id,
        customerCode: rawCustomer.customer_code,
        firstName: rawCustomer.first_name,
        lastName: rawCustomer.last_name,
        businessName: rawCustomer.business_name,
        phone: rawCustomer.phone,
        email: rawCustomer.email,
        status: rawCustomer.status,
      }
    : null;

  const orders = (ordersResult.data ?? []) as unknown as {
    id: string;
    order_number: string;
    created_at: string;
    total_amount: number;
  }[];

  const paidByOrder = new Map<string, number>();
  if (orders.length > 0) {
    const { data: payments } = await client
      .from("payments")
      .select("order_id, amount, status")
      .in("order_id", orders.map((order) => order.id));
    for (const payment of payments ?? []) {
      if (payment.status === "paid" || payment.status === "authorized") {
        paidByOrder.set(
          payment.order_id,
          (paidByOrder.get(payment.order_id) ?? 0) + Number(payment.amount),
        );
      }
    }
  }

  const now = new Date();
  const rows: ReceivableOrderRow[] = orders.map((order) => {
    const total = Number(order.total_amount);
    const paid = paidByOrder.get(order.id) ?? 0;
    const age = ageInDays(order.created_at, now);
    return {
      orderId: order.id,
      orderNumber: order.order_number,
      customerId,
      customerName: customer
        ? `${customer.firstName} ${customer.lastName}`
        : "Guest",
      customerPhone: customer?.phone ?? null,
      createdAt: order.created_at,
      totalAmount: total,
      paidAmount: paid,
      outstanding: Math.max(0, total - paid),
      ageDays: age,
      agingBucket: agingBucketFor(age),
    };
  });

  return { customer, rows };
}