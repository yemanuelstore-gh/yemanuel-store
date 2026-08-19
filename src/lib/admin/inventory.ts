import type { DashboardClient } from "@/lib/admin/dashboard";
import { fetchAllPaged } from "@/lib/admin/dashboard";
import type { ListQuery, ListResult } from "@/lib/admin/query";
import { listQuery } from "@/lib/admin/query";

export { PAGE_SIZE } from "@/lib/admin/query";

export type ProductListRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  created_at: string;
  variant_count: number;
  first_sku: string | null;
  price_min: number | null;
  price_max: number | null;
};

type VariantSeed = { id: string; product_id: string; sku: string | null };
type PriceSeed = { variant_id: string; amount: number };

export async function listProducts(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<ProductListRow>> {
  const result = await listQuery<Omit<ProductListRow, "variant_count" | "first_sku" | "price_min" | "price_max">>(
    client,
    "products",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, name, slug, status, created_at",
  );

  if (result.rows.length === 0) return { rows: [], total: 0 };

  const productIds = result.rows.map((row) => row.id);
  const [variants, prices] = await Promise.all([
    client
      .from("product_variants")
      .select("id, product_id, sku")
      .in("product_id", productIds),
    (async () => {
      const variantResult = await client
        .from("product_variants")
        .select("id")
        .in("product_id", productIds);
      const variantIds = ((variantResult.data ?? []) as { id: string }[]).map((v) => v.id);
      if (variantIds.length === 0) return { data: [] as PriceSeed[] } as const;
      return client
        .from("prices")
        .select("variant_id, amount")
        .in("variant_id", variantIds)
        .eq("price_type", "selling");
    })(),
  ]);

  const variantsByProduct = new Map<string, VariantSeed[]>();
  for (const variant of (variants.data ?? []) as unknown as VariantSeed[]) {
    const list = variantsByProduct.get(variant.product_id) ?? [];
    list.push(variant);
    variantsByProduct.set(variant.product_id, list);
  }

  const pricesByProduct = new Map<string, number[]>();
  for (const price of (prices.data ?? []) as unknown as PriceSeed[]) {
    for (const [productId, list] of variantsByProduct) {
      if (list.some((variant) => variant.id === price.variant_id)) {
        const amounts = pricesByProduct.get(productId) ?? [];
        amounts.push(Number(price.amount || 0));
        pricesByProduct.set(productId, amounts);
      }
    }
  }

  const rows: ProductListRow[] = result.rows.map((row) => {
    const variantsOfProduct = variantsByProduct.get(row.id) ?? [];
    const amounts = (pricesByProduct.get(row.id) ?? []).filter((amount) => amount > 0);
    return {
      ...row,
      variant_count: variantsOfProduct.length,
      first_sku: variantsOfProduct[0]?.sku ?? null,
      price_min: amounts.length ? Math.min(...amounts) : null,
      price_max: amounts.length ? Math.max(...amounts) : null,
    };
  });

  return { rows, total: result.total };
}

export type VariantListRow = {
  id: string;
  sku: string | null;
  name: string;
  status: string;
  created_at: string;
  products: { name: string } | null;
};

export function listVariants(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<VariantListRow>> {
  return listQuery(
    client,
    "product_variants",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(`sku.ilike.%${term}%,name.ilike.%${term}%`);
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, sku, name, status, created_at, products(name)",
  );
}

export type StockRow = {
  id: string;
  location_id: string | null;
  quantity_on_hand: number;
  reserved_quantity: number;
  average_cost: number | null;
  reorder_level: number | null;
  reorder_quantity: number | null;
  updated_at: string;
  product_variants: {
    id: string;
    name: string | null;
    sku: string | null;
    products: { id: string; name: string } | null;
  } | null;
};

/** Find variant ids matching a search term (by sku or product name). */
async function searchVariantIds(
  client: DashboardClient,
  term: string,
): Promise<string[] | null> {
  const variantIds = new Set<string>();
  const skuResult = await client
    .from("product_variants")
    .select("id")
    .ilike("sku", `%${term}%`)
    .limit(1000);
  for (const row of (skuResult.data ?? []) as { id: string }[]) variantIds.add(row.id);

  const productResult = await client
    .from("products")
    .select("id")
    .ilike("name", `%${term}%`)
    .limit(1000);
  const productIds = ((productResult.data ?? []) as { id: string }[]).map((p) => p.id);
  if (productIds.length > 0) {
    const variantResult = await client
      .from("product_variants")
      .select("id")
      .in("product_id", productIds)
      .limit(1000);
    for (const row of (variantResult.data ?? []) as { id: string }[]) variantIds.add(row.id);
  }

  return variantIds.size > 0 ? [...variantIds] : [];
}

export async function listStock(
  client: DashboardClient,
  params: ListQuery & { locationId?: string },
): Promise<ListResult<StockRow>> {
  const term = params.q?.trim();
let variantIds: string[] | null = null;
  if (term) {
    const ids = (await searchVariantIds(client, term)) ?? [];
    variantIds = ids;
    if (ids.length === 0) return { rows: [], total: 0 };
  }

  const result = await listQuery<StockRow>(
    client,
    "inventory_items",
    params,
    (q) => {
      let query = q.order("updated_at", { ascending: false });
      if (variantIds) query = query.in("variant_id", variantIds);
      if (params.locationId) query = query.eq("location_id", params.locationId);
      return query;
    },
    "id, location_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity, updated_at, product_variants(id, name, sku, products(id, name))",
  );

  return result;
}

export type WarehouseRow = {
  id: string;
  code: string | null;
  name: string;
  location_type: string | null;
  city: string | null;
  address_line_1: string | null;
  phone: string | null;
  status: string | null;
};

export function listWarehouses(
  client: DashboardClient,
  params: ListQuery & { type?: string },
): Promise<ListResult<WarehouseRow>> {
  return listQuery(
    client,
    "locations",
    params,
    (q) => {
      let query = q.order("name", { ascending: true });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%,city.ilike.%${term}%`);
        }
      }
      if (params.type) query = query.eq("location_type", params.type);
      return query;
    },
    "id, code, name, location_type, city, address_line_1, phone, status",
  );
}

export type TransferListRow = {
  id: string;
  transfer_number: string;
  status: string | null;
  notes: string | null;
  created_at: string;
  stock_transfers_from_location_id_fkey: { name: string } | null;
  stock_transfers_to_location_id_fkey: { name: string } | null;
};

export function listTransfers(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<TransferListRow>> {
  return listQuery(
    client,
    "stock_transfers",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.ilike("transfer_number", `%${term}%`);
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, transfer_number, status, notes, created_at, stock_transfers_from_location_id_fkey(name), stock_transfers_to_location_id_fkey(name)",
  );
}

export type AdjustmentListRow = {
  id: string;
  adjustment_number: string;
  reason: string | null;
  status: string | null;
  created_at: string;
};

export function listAdjustments(
  client: DashboardClient,
  params: ListQuery & { status?: string },
): Promise<ListResult<AdjustmentListRow>> {
  return listQuery(
    client,
    "stock_adjustments",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.ilike("adjustment_number", `%${term}%`);
        }
      }
      if (params.status) query = query.eq("status", params.status);
      return query;
    },
    "id, adjustment_number, reason, status, created_at",
  );
}
// ---------------------------------------------------------------------------
// Report aggregations
// ---------------------------------------------------------------------------

export type StockByLocationRow = {
  location_id: string;
  location_name: string;
  units: number;
  value: number;
  sku_count: number;
};

export async function getStockByLocation(
  client: DashboardClient,
): Promise<StockByLocationRow[]> {
  const { data: locations, error: locationError } = await client
    .from("locations")
    .select("id, name")
    .order("name", { ascending: true });
  if (locationError) throw locationError;

  const items = await fetchAllPaged<{
    location_id: string | null;
    quantity_on_hand: number;
    average_cost: number | null;
    variant_id: string | null;
  }>((from, to) =>
    client
      .from("inventory_items")
      .select("location_id, quantity_on_hand, average_cost, variant_id")
      .range(from, to),
  );

  const byLocation = new Map<string, StockByLocationRow>();
  for (const item of items) {
    if (!item.location_id) continue;
    const row = byLocation.get(item.location_id) ?? {
      location_id: item.location_id,
      location_name: "",
      units: 0,
      value: 0,
      sku_count: 0,
    };
    row.units += Number(item.quantity_on_hand || 0);
    row.value += Number(item.quantity_on_hand || 0) * Number(item.average_cost || 0);
    if (item.variant_id) row.sku_count += 1;
    byLocation.set(item.location_id, row);
  }

  const nameById = new Map((locations ?? []).map((location) => [location.id, location.name]));
  return [...byLocation.values()]
    .map((row) => ({
      ...row,
      location_name: nameById.get(row.location_id) ?? "Unknown location",
      value: Number(row.value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);
}

export type StockByVariantRow = {
  variant_id: string;
  sku: string | null;
  product_name: string | null;
  units: number;
  value: number;
};

export async function getStockByVariant(
  client: DashboardClient,
  limit = 10,
): Promise<StockByVariantRow[]> {
  const items = await fetchAllPaged<{
    variant_id: string | null;
    quantity_on_hand: number;
    average_cost: number | null;
  }>((from, to) =>
    client
      .from("inventory_items")
      .select("variant_id, quantity_on_hand, average_cost")
      .range(from, to),
  );

  const byVariant = new Map<string, StockByVariantRow>();
  for (const item of items) {
    if (!item.variant_id) continue;
    const row = byVariant.get(item.variant_id) ?? {
      variant_id: item.variant_id,
      sku: null,
      product_name: null,
      units: 0,
      value: 0,
    };
    row.units += Number(item.quantity_on_hand || 0);
    row.value += Number(item.quantity_on_hand || 0) * Number(item.average_cost || 0);
    byVariant.set(item.variant_id, row);
  }

  const variantIds = [...byVariant.keys()];
  const variantMeta = new Map<string, { sku: string | null; product_name: string | null }>();
  for (let i = 0; i < variantIds.length; i += 900) {
    const batch = variantIds.slice(i, i + 900);
    const { data } = await client
      .from("product_variants")
      .select("id, sku, products(name)")
      .in("id", batch);
    const variants = (data ?? []) as unknown as {
      id: string;
      sku: string | null;
      products: { name: string } | null;
    }[];
    for (const variant of variants) {
      variantMeta.set(variant.id, {
        sku: variant.sku,
        product_name: variant.products?.name ?? null,
      });
    }
  }

  return [...byVariant.values()]
    .map((row) => {
      const meta = variantMeta.get(row.variant_id);
      return {
        ...row,
        sku: meta?.sku ?? null,
        product_name: meta?.product_name ?? null,
        value: Number(row.value.toFixed(2)),
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}
