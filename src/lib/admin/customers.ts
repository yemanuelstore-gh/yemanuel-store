import { createClient } from "@/lib/supabase/server";

export type AdminCustomerRow = {
  id: string;
  customerCode: string;
  firstName: string;
  lastName: string;
  businessName: string | null;
  phone: string;
  email: string | null;
  customerType: string;
  status: string;
  createdAt: string;
  orderCount: number;
};

export async function getCustomers({
  q,
  customerType,
  status,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  customerType?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ customers: AdminCustomerRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("customers")
    .select(
      "id, customer_code, first_name, last_name, business_name, phone, email, customer_type, status, created_at",
      { count: "exact" },
    );

  if (q && q.trim() !== "") {
    const term = `%${q.trim()}%`;
    query = query.or(
      `first_name.ilike.${term},last_name.ilike.${term},customer_code.ilike.${term},phone.ilike.${term},business_name.ilike.${term}`,
    );
  }
  if (customerType) query = query.eq("customer_type", customerType);
  if (status) query = query.eq("status", status);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    customer_code: string;
    first_name: string;
    last_name: string;
    business_name: string | null;
    phone: string;
    email: string | null;
    customer_type: string;
    status: string;
    created_at: string;
  }[];

  const ids = rows.map((row) => row.id);
  const orderCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: orders } = await client
      .from("orders")
      .select("customer_id")
      .in("customer_id", ids);
    for (const row of orders ?? []) {
      orderCounts.set(row.customer_id, (orderCounts.get(row.customer_id) ?? 0) + 1);
    }
  }

  return {
    customers: rows.map((row) => ({
      id: row.id,
      customerCode: row.customer_code,
      firstName: row.first_name,
      lastName: row.last_name,
      businessName: row.business_name,
      phone: row.phone,
      email: row.email,
      customerType: row.customer_type,
      status: row.status,
      createdAt: row.created_at,
      orderCount: orderCounts.get(row.id) ?? 0,
    })),
    total: count ?? 0,
  };
}

export type AdminCustomerDetail = {
  id: string;
  customerCode: string;
  customerType: string;
  firstName: string;
  lastName: string;
  businessName: string | null;
  phone: string;
  email: string | null;
  tinNumber: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  addresses: {
    id: string;
    label: string;
    recipientName: string;
    recipientPhone: string;
    addressLine1: string;
    addressLine2: string | null;
    cityName: string | null;
    regionName: string | null;
    postalCode: string | null;
    isDefaultDelivery: boolean;
    isDefaultBilling: boolean;
  }[];
  orders: {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    totalAmount: number;
    createdAt: string;
  }[];
  orderCount: number;
};

export async function getCustomerById(id: string): Promise<AdminCustomerDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("customers")
    .select(
      "id, customer_code, customer_type, first_name, last_name, business_name, phone, email, tin_number, status, notes, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    customer_code: string;
    customer_type: string;
    first_name: string;
    last_name: string;
    business_name: string | null;
    phone: string;
    email: string | null;
    tin_number: string | null;
    status: string;
    notes: string | null;
    created_at: string;
    updated_at: string;
  };

  const [addressesResult, ordersResult, orderCountResult] = await Promise.all([
    client
      .from("customer_addresses")
      .select(
        "id, label, recipient_name, recipient_phone, address_line_1, address_line_2, postal_code, is_default_delivery, is_default_billing, cities(name), regions(name)",
      )
      .eq("customer_id", id)
      .order("created_at", { ascending: true }),
    client
      .from("orders")
      .select("id, order_number, status, payment_status, total_amount, created_at")
      .eq("customer_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    client.from("orders").select("id", { count: "exact", head: true }).eq("customer_id", id),
  ]);

  const addresses = ((addressesResult.data ?? []) as unknown as {
    id: string;
    label: string;
    recipient_name: string;
    recipient_phone: string;
    address_line_1: string;
    address_line_2: string | null;
    postal_code: string | null;
    is_default_delivery: boolean;
    is_default_billing: boolean;
    cities: { name: string } | null;
    regions: { name: string } | null;
  }[]).map((address) => ({
    id: address.id,
    label: address.label,
    recipientName: address.recipient_name,
    recipientPhone: address.recipient_phone,
    addressLine1: address.address_line_1,
    addressLine2: address.address_line_2,
    cityName: address.cities?.name ?? null,
    regionName: address.regions?.name ?? null,
    postalCode: address.postal_code,
    isDefaultDelivery: Boolean(address.is_default_delivery),
    isDefaultBilling: Boolean(address.is_default_billing),
  }));

  const orders = ((ordersResult.data ?? []) as unknown as {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
  }[]).map((order) => ({
    id: order.id,
    orderNumber: order.order_number,
    status: order.status,
    paymentStatus: order.payment_status,
    totalAmount: Number(order.total_amount),
    createdAt: order.created_at,
  }));

  return {
    id: row.id,
    customerCode: row.customer_code,
    customerType: row.customer_type,
    firstName: row.first_name,
    lastName: row.last_name,
    businessName: row.business_name,
    phone: row.phone,
    email: row.email,
    tinNumber: row.tin_number,
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    addresses,
    orders,
    orderCount: orderCountResult.count ?? orders.length,
  };
}