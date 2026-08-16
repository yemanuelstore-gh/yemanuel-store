import { createClient } from "@/lib/supabase/server";

export type SalesOverview = {
  totalOrders: number;
  totalItemsSold: number;
  collectedRevenue: number;
  averageOrderValue: number;
  orderStatuses: { status: string; count: number }[];
};

export async function getSalesOverview(): Promise<SalesOverview> {
  const client = await createClient();

  const [ordersResult, itemsResult, paymentsResult] = await Promise.all([
    client.from("orders").select("id, status"),
    client.from("order_items").select("quantity"),
    client.from("payments").select("amount").in("status", ["paid", "authorized"]),
  ]);

  const orders = (ordersResult.data ?? []) as unknown as { id: string; status: string }[];
  const items = (itemsResult.data ?? []) as unknown as { quantity: number }[];
  const payments = (paymentsResult.data ?? []) as unknown as { amount: number }[];

  const collectedRevenue = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const totalItemsSold = items.reduce((sum, item) => sum + Number(item.quantity), 0);

  const statusMap = new Map<string, number>();
  orders.forEach((order) => statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1));

  return {
    totalOrders: orders.length,
    totalItemsSold,
    collectedRevenue,
    averageOrderValue: orders.length > 0 ? collectedRevenue / orders.length : 0,
    orderStatuses: Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    })),
  };
}

export type TopProductRow = {
  variantName: string;
  productName: string | null;
  quantity: number;
  revenue: number;
};

export async function getTopProducts(limit = 10): Promise<TopProductRow[]> {
  const client = await createClient();
  const { data } = await client
    .from("order_items")
    .select("variant_id, quantity, unit_price, product_variants(name, sku, products(name))");

  const rows = (data ?? []) as unknown as {
    variant_id: string;
    quantity: number;
    unit_price: number;
    product_variants: { name: string; sku: string; products: { name: string } | null } | null;
  }[];

  const aggregated = new Map<
    string,
    { variantName: string; productName: string | null; quantity: number; revenue: number }
  >();

  rows.forEach((row) => {
    const key = row.variant_id;
    const current = aggregated.get(key) ?? {
      variantName: row.product_variants?.name ?? "—",
      productName: row.product_variants?.products?.name ?? null,
      quantity: 0,
      revenue: 0,
    };
    current.quantity += Number(row.quantity);
    current.revenue += Number(row.quantity) * Number(row.unit_price);
    aggregated.set(key, current);
  });

  return Array.from(aggregated.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, limit);
}

export type ExpenseSummaryRow = {
  categoryName: string;
  total: number;
  count: number;
};

export async function getExpenseSummary(): Promise<ExpenseSummaryRow[]> {
  const client = await createClient();
  const { data } = await client
    .from("expenses")
    .select("amount, expense_categories(name)");

  const rows = (data ?? []) as unknown as {
    amount: number;
    expense_categories: { name: string } | null;
  }[];

  const aggregated = new Map<string, { total: number; count: number }>();
  rows.forEach((row) => {
    const key = row.expense_categories?.name ?? "Uncategorised";
    const current = aggregated.get(key) ?? { total: 0, count: 0 };
    current.total += Number(row.amount);
    current.count += 1;
    aggregated.set(key, current);
  });

  return Array.from(aggregated.entries())
    .map(([categoryName, value]) => ({ categoryName, ...value }))
    .sort((a, b) => b.total - a.total);
}