import { createClient } from "@/lib/supabase/server";
import { fetchAllPaged, reportRpc, take } from "@/lib/admin/reporting";
import type {
  CategoryPoint,
  DashboardRange,
  TopProduct,
} from "@/lib/admin/dashboard";

/**
 * Products report data layer.
 *
 * Category performance and top products come from the app.dashboard_* SQL
 * functions. Per-product sales and on-hand figures have no server-side
 * aggregate, so they are computed in the application from paged fetches
 * (exact beyond the PostgREST 1,000-row cap) and joined to the product
 * catalogue.
 */

export type ProductReportRow = {
  productId: string;
  name: string;
  categoryName: string | null;
  brandName: string | null;
  status: string;
  variantCount: number;
  unitsSold: number;
  revenue: number;
  onHandUnits: number;
};

export type ProductReportData = {
  range: DashboardRange;
  byCategory: CategoryPoint[] | null;
  topProducts: TopProduct[] | null;
  rows: ProductReportRow[];
  total: number;
  available: boolean;
};

export async function getProductReport(
  range: DashboardRange,
  page = 1,
  pageSize = 25,
): Promise<ProductReportData> {
  const client = await createClient();
  const args = {
    p_start: range.start.toISOString(),
    p_end: range.end.toISOString(),
  };
  const startIso = range.start.toISOString();
  const endIso = range.end.toISOString();

  const [byCategoryRes, topProductsRes, productsResult, orderItems, inventoryItems] =
    await Promise.all([
      reportRpc<CategoryPoint[]>("dashboard_sales_by_category", args),
      reportRpc<TopProduct[]>("dashboard_top_products", { ...args, p_limit: 10 }),
      client
        .from("products")
        .select(
          "id, name, status, categories(name), brands(name), product_variants(id)",
          { count: "exact" },
        )
        .order("name"),
      fetchAllPaged<{
        variant_id: string | null;
        quantity: number;
        line_total: number;
        product_variants: { product_id: string } | null;
      }>((from, to) =>
        client
          .from("order_items")
          .select("variant_id, quantity, line_total, product_variants(product_id), orders!inner(status)")
          .neq("orders.status", "cancelled")
          .gte("created_at", startIso)
          .lte("created_at", endIso)
          .range(from, to),
      ),
      fetchAllPaged<{
        variant_id: string;
        quantity_on_hand: number;
        product_variants: { product_id: string } | null;
      }>((from, to) =>
        client
          .from("inventory_items")
          .select("variant_id, quantity_on_hand, product_variants(product_id)")
          .range(from, to),
      ),
    ]);

  const productSales = new Map<string, { units: number; revenue: number }>();
  for (const item of orderItems) {
    const productId = item.product_variants?.product_id;
    if (!productId) continue;
    const current = productSales.get(productId) ?? { units: 0, revenue: 0 };
    current.units += Number(item.quantity);
    current.revenue += Number(item.line_total);
    productSales.set(productId, current);
  }

  const productOnHand = new Map<string, number>();
  for (const item of inventoryItems) {
    const productId = item.product_variants?.product_id;
    if (!productId) continue;
    productOnHand.set(
      productId,
      (productOnHand.get(productId) ?? 0) + Number(item.quantity_on_hand),
    );
  }

  const products = (productsResult.data ?? []) as unknown as {
    id: string;
    name: string;
    status: string;
    categories: { name: string } | null;
    brands: { name: string } | null;
    product_variants: { id: string }[];
  }[];

  const rows: ProductReportRow[] = products.map((product) => {
    const sales = productSales.get(product.id) ?? { units: 0, revenue: 0 };
    return {
      productId: product.id,
      name: product.name,
      categoryName: product.categories?.name ?? null,
      brandName: product.brands?.name ?? null,
      status: product.status,
      variantCount: (product.product_variants ?? []).length,
      unitsSold: sales.units,
      revenue: sales.revenue,
      onHandUnits: productOnHand.get(product.id) ?? 0,
    };
  });

  const sorted = rows.sort((a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name));

  return {
    range,
    byCategory: take(byCategoryRes),
    topProducts: take(topProductsRes),
    rows: sorted.slice((page - 1) * pageSize, page * pageSize),
    total: countOrFallback(productsResult.count, products.length),
    available: byCategoryRes.ok,
  };
}

function countOrFallback(count: number | null, fallback: number): number {
  return typeof count === "number" ? count : fallback;
}