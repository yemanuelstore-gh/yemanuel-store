import { createClient } from "@/lib/supabase/server";
import { fetchAllPaged, reportRpc, take } from "@/lib/admin/reporting";
import type {
  CustomerPoint,
  CustomersSummary,
  DashboardRange,
} from "@/lib/admin/dashboard";

/**
 * Customers report data layer. Summary KPIs come from
 * app.dashboard_customers_summary; per-customer order stats are computed in
 * the application from paged order fetches so results are exact beyond the
 * PostgREST 1,000-row cap.
 */

export type CustomerReportRow = {
  customerId: string | null;
  name: string;
  code: string | null;
  phone: string | null;
  orderCount: number;
  spend: number;
  averageOrderValue: number;
  lastOrderAt: string | null;
};

export type CustomerReportData = {
  range: DashboardRange;
  summary: CustomersSummary | null;
  topCustomers: CustomerPoint[] | null;
  rows: CustomerReportRow[];
  total: number;
  available: boolean;
};

export async function getCustomerReport(
  range: DashboardRange,
  page = 1,
  pageSize = 25,
): Promise<CustomerReportData> {
  const client = await createClient();
  const args = {
    p_start: range.start.toISOString(),
    p_end: range.end.toISOString(),
  };

  const [summaryRes, topCustomersRes, orders] = await Promise.all([
    reportRpc<CustomersSummary>("dashboard_customers_summary", {
      p_month_start: range.start.toISOString(),
      p_year_start: range.start.toISOString(),
    }),
    reportRpc<CustomerPoint[]>("dashboard_top_customers", { ...args, p_limit: 10 }),
    fetchAllPaged<{
      customer_id: string | null;
      total_amount: number;
      created_at: string;
      customers: {
        first_name: string;
        last_name: string;
        customer_code: string;
        phone: string;
      } | null;
    }>((from, to) =>
      client
        .from("orders")
        .select(
          "customer_id, total_amount, created_at, customers(first_name, last_name, customer_code, phone)",
        )
        .neq("status", "cancelled")
        .gte("created_at", args.p_start)
        .lte("created_at", args.p_end)
        .range(from, to),
    ),
  ]);

  const byCustomer = new Map<
    string,
    { name: string; code: string | null; phone: string | null; orderCount: number; spend: number; lastOrderAt: string | null }
  >();

  for (const order of orders) {
    const key = order.customer_id ?? "guest";
    const current = byCustomer.get(key) ?? {
      name: order.customers
        ? `${order.customers.first_name} ${order.customers.last_name}`
        : "Guest",
      code: order.customers?.customer_code ?? null,
      phone: order.customers?.phone ?? null,
      orderCount: 0,
      spend: 0,
      lastOrderAt: null,
    };
    current.orderCount += 1;
    current.spend += Number(order.total_amount);
    if (!current.lastOrderAt || order.created_at > current.lastOrderAt) {
      current.lastOrderAt = order.created_at;
    }
    byCustomer.set(key, current);
  }

  const all = Array.from(byCustomer.entries()).map(([key, value]) => ({
    customerId: key === "guest" ? null : key,
    ...value,
    averageOrderValue: value.orderCount > 0 ? value.spend / value.orderCount : 0,
  }));
  all.sort((a, b) => b.spend - a.spend || a.name.localeCompare(b.name));

  return {
    range,
    summary: take(summaryRes),
    topCustomers: take(topCustomersRes),
    rows: all.slice((page - 1) * pageSize, page * pageSize),
    total: all.length,
    available: summaryRes.ok,
  };
}