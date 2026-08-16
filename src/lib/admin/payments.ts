import { createClient } from "@/lib/supabase/server";

export type AdminPaymentRow = {
  id: string;
  reference: string | null;
  orderId: string;
  orderNumber: string;
  customerName: string | null;
  amount: number;
  method: string;
  status: string;
  provider: string | null;
  providerReference: string | null;
  paymentDate: string;
  receivedByName: string | null;
  notes: string | null;
  createdAt: string;
};

export async function getAdminPayments({
  q,
  method,
  status,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  method?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ payments: AdminPaymentRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("payments")
    .select(
      `
      id, reference, order_id, amount, method, status, provider, provider_reference,
      payment_date, received_by, notes, created_at,
      orders(order_number, guest_name, customers(first_name, last_name)),
      staff(first_name, last_name)
    `,
      { count: "exact" },
    );

  if (q && q.trim() !== "") {
    query = query.or(
      `reference.ilike.%${q.trim()}%,provider_reference.ilike.%${q.trim()}%,orders.order_number.ilike.%${q.trim()}%`,
    );
  }
  if (method) query = query.eq("method", method);
  if (status) query = query.eq("status", status);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    reference: string | null;
    order_id: string;
    amount: number;
    method: string;
    status: string;
    provider: string | null;
    provider_reference: string | null;
    payment_date: string;
    received_by: string | null;
    notes: string | null;
    created_at: string;
    orders: {
      order_number: string;
      guest_name: string | null;
      customers: { first_name: string; last_name: string } | null;
    } | null;
    staff: { first_name: string; last_name: string } | null;
  }[];

  return {
    payments: rows.map((row) => ({
      id: row.id,
      reference: row.reference,
      orderId: row.order_id,
      orderNumber: row.orders?.order_number ?? "—",
      customerName: row.orders?.customers
        ? `${row.orders.customers.first_name} ${row.orders.customers.last_name}`
        : row.orders?.guest_name ?? null,
      amount: Number(row.amount),
      method: row.method,
      status: row.status,
      provider: row.provider,
      providerReference: row.provider_reference,
      paymentDate: row.payment_date,
      receivedByName: row.staff
        ? `${row.staff.first_name} ${row.staff.last_name}`
        : null,
      notes: row.notes,
      createdAt: row.created_at,
    })),
    total: count ?? 0,
  };
}

export async function getAdminPaymentById(
  paymentId: string,
): Promise<AdminPaymentRow | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("payments")
    .select(
      `
      id, reference, order_id, amount, method, status, provider, provider_reference,
      payment_date, received_by, notes, created_at,
      orders(order_number, guest_name, customers(first_name, last_name)),
      staff(first_name, last_name)
    `,
    )
    .eq("id", paymentId)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    reference: string | null;
    order_id: string;
    amount: number;
    method: string;
    status: string;
    provider: string | null;
    provider_reference: string | null;
    payment_date: string;
    received_by: string | null;
    notes: string | null;
    created_at: string;
    orders: {
      order_number: string;
      guest_name: string | null;
      customers: { first_name: string; last_name: string } | null;
    } | null;
    staff: { first_name: string; last_name: string } | null;
  };

  return {
    id: row.id,
    reference: row.reference,
    orderId: row.order_id,
    orderNumber: row.orders?.order_number ?? "—",
    customerName: row.orders?.customers
      ? `${row.orders.customers.first_name} ${row.orders.customers.last_name}`
      : row.orders?.guest_name ?? null,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
    provider: row.provider,
    providerReference: row.provider_reference,
    paymentDate: row.payment_date,
    receivedByName: row.staff
      ? `${row.staff.first_name} ${row.staff.last_name}`
      : null,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

/**
 * Payments available to link to a refund, for the selected order. Only
 * records that can actually be refunded against are offered.
 */
export async function getPaymentsForRefundSelect(): Promise<
  { id: string; reference: string | null; orderId: string; amount: number; method: string; status: string }[]
> {
  const client = await createClient();
  const { data } = await client
    .from("payments")
    .select("id, reference, order_id, amount, method, status")
    .in("status", ["paid", "authorized", "refunded"]);
  return ((data ?? []) as unknown as {
    id: string;
    reference: string | null;
    order_id: string;
    amount: number;
    method: string;
    status: string;
  }[]).map((row) => ({
    id: row.id,
    reference: row.reference,
    orderId: row.order_id,
    amount: Number(row.amount),
    method: row.method,
    status: row.status,
  }));
}