import type { DashboardClient } from "@/lib/admin/dashboard";
import type { ListQuery, ListResult } from "@/lib/admin/query";
import { listQuery } from "@/lib/admin/query";

export { PAGE_SIZE } from "@/lib/admin/query";
export type { ListQuery, ListResult } from "@/lib/admin/query";

export type CustomerRef = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  email: string | null;
  phone: string | null;
};

export type QuotationListRow = {
  id: string;
  quotation_number: string;
  customer_id: string | null;
  guest_name: string | null;
  status: string | null;
  quotation_date: string | null;
  valid_until: string | null;
  total_amount: number | null;
  created_at: string;
  customers: CustomerRef | null;
};

export type OrderListRow = {
  id: string;
  order_number: string;
  customer_id: string | null;
  guest_name: string | null;
  channel: string | null;
  status: string | null;
  payment_status: string | null;
  fulfilment_status: string | null;
  total_amount: number | null;
  created_at: string;
  customers: CustomerRef | null;
};

export type ReturnListRow = {
  id: string;
  return_number: string;
  status: string | null;
  reason: string | null;
  reason_note: string | null;
  created_at: string;
  orders: { order_number: string } | null;
  customers: CustomerRef | null;
};

export type CustomerListRow = {
  id: string;
  customer_code: string | null;
  customer_type: string | null;
  first_name: string | null;
  last_name: string | null;
  business_name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  created_at: string;
};

export function customerDisplayName(
  customer: Pick<CustomerListRow, "first_name" | "last_name" | "business_name"> | null,
  fallback?: string | null,
): string {
  if (customer) {
    const individual = [customer.first_name, customer.last_name].filter(Boolean).join(" ");
    return individual || customer.business_name || "Unknown customer";
  }
  return fallback || "Guest";
}

export function listQuotations(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<QuotationListRow>> {
  return listQuery(
    client,
    "quotations",
    params,
    (q) => {
      let query = q.order("quotation_date", { ascending: false, nullsFirst: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(`quotation_number.ilike.%${term}%,guest_name.ilike.%${term}%`);
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, quotation_number, customer_id, guest_name, status, quotation_date, valid_until, total_amount, created_at, customers(first_name, last_name, business_name)",
  );
}

export function listReturns(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<ReturnListRow>> {
  return listQuery(
    client,
    "returns",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(`return_number.ilike.%${term}%`);
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, return_number, status, reason, reason_note, created_at, orders(order_number), customers(first_name, last_name, business_name)",
  );
}

export function listCustomers(
  client: DashboardClient,
  params: ListQuery & { type?: string; status?: string },
): Promise<ListResult<CustomerListRow>> {
  return listQuery(
    client,
    "customers",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(
            `first_name.ilike.%${term}%,last_name.ilike.%${term}%,business_name.ilike.%${term}%,customer_code.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
          );
        }
      }
      if (params.type) query = query.eq("customer_type", params.type);
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, customer_code, customer_type, first_name, last_name, business_name, phone, email, status, created_at",
  );
}

export function listOrders(
  client: DashboardClient,
  params: ListQuery & { status?: string; paymentStatus?: string; channel?: string },
): Promise<ListResult<OrderListRow>> {
  return listQuery(
    client,
    "orders",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(
            `order_number.ilike.%${term}%,guest_name.ilike.%${term}%`,
          );
        }
      }
      if (params.status) query = query.eq("status", params.status);
      if (params.paymentStatus) query = query.eq("payment_status", params.paymentStatus);
      if (params.channel) query = query.eq("channel", params.channel);
      return query;
    },
    "id, order_number, customer_id, guest_name, channel, status, payment_status, fulfilment_status, total_amount, created_at, customers(first_name, last_name, business_name)",
  );
}