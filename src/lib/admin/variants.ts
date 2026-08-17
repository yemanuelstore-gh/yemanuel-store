import { effectivePricing, pricingFor, type PriceRow } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

/**
 * Product Variants + Barcodes + Price Lists data access.
 *
 * Reads that existing RLS gates behind permissions a products.read role may
 * not hold (inventory_items -> inventory.read, locations -> settings.manage)
 * run through the service-role client, following the documented precedents in
 * lib/pos/catalogue.ts and lib/admin/quotations.ts. Authorization is enforced
 * at the page/action boundaries with products.read/create/update.
 */

export type PricePeriod = "active" | "future" | "expired";

export function pricePeriod(validFrom: string, validTo: string | null): PricePeriod {
  const now = Date.now();
  const from = new Date(validFrom).getTime();
  const to = validTo ? new Date(validTo).getTime() : null;
  if (to !== null && to < now) return "expired";
  if (from > now) return "future";
  return "active";
}

type PriceRowWithRange = PriceRow & {
  valid_from: string;
  valid_to: string | null;
};

function currentPrices(rows: PriceRowWithRange[]): PriceRowWithRange[] {
  const now = Date.now();
  return rows.filter((price) => {
    const from = price.valid_from ? new Date(price.valid_from).getTime() : 0;
    const to = price.valid_to ? new Date(price.valid_to).getTime() : null;
    return from <= now && (to === null || to >= now);
  });
}

function effectiveFor(
  rows: PriceRowWithRange[],
  variantId: string,
): { price: number | null; salePrice: number | null; hasSale: boolean } {
  return effectivePricing(pricingFor(currentPrices(rows), variantId));
}

// ---------------------------------------------------------------------------
// Variant list
// ---------------------------------------------------------------------------

export type VariantListItem = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  status: string;
  options: Record<string, unknown> | null;
  productId: string;
  productName: string;
  productStatus: string;
  sellingPrice: number | null;
  salePrice: number | null;
  stockTotal: number;
};

type VariantListRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  options: Record<string, unknown> | null;
  status: string;
  product_id: string;
  created_at: string;
  products: { name: string; status: string } | null;
};

const VARIANT_LIST_SELECT =
  "id, name, sku, barcode, options, status, product_id, created_at, products(name, status)";

export async function getVariantList({
  q,
  productId,
  status,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  productId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ variants: VariantListItem[]; total: number }> {
  const client = await createClient();
  const term = q?.trim() ?? "";

  const rows: VariantListRow[] = [];
  let total = 0;

  if (term === "") {
    let query = client
      .from("product_variants")
      .select(VARIANT_LIST_SELECT, { count: "exact" });
    if (productId) query = query.eq("product_id", productId);
    if (status) query = query.eq("status", status);
    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    rows.push(...((data ?? []) as unknown as VariantListRow[]));
    total = count ?? rows.length;
  } else {
    const seen = new Set<string>();
    const merge = (candidates: VariantListRow[]) => {
      for (const row of candidates) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        rows.push(row);
      }
    };

    let directQuery = client
      .from("product_variants")
      .select(VARIANT_LIST_SELECT)
      .or(`name.ilike.%${term}%,sku.ilike.%${term}%,barcode.ilike.%${term}%`);
    if (productId) directQuery = directQuery.eq("product_id", productId);
    if (status) directQuery = directQuery.eq("status", status);
    const direct = await directQuery
      .order("created_at", { ascending: false })
      .range(0, 399);
    merge((direct.data ?? []) as unknown as VariantListRow[]);

    // Product-name matches resolve through a separate products query
    // (PostgREST here does not support embedded-resource or() filters).
    const productsResult = await client
      .from("products")
      .select("id")
      .ilike("name", `%${term}%`)
      .limit(50);
    const productIds = ((productsResult.data ?? []) as { id: string }[]).map(
      (row) => row.id,
    );
    if (productIds.length > 0) {
      let byProduct = client
        .from("product_variants")
        .select(VARIANT_LIST_SELECT)
        .in("product_id", productIds);
      if (productId) byProduct = byProduct.eq("product_id", productId);
      if (status) byProduct = byProduct.eq("status", status);
      const matched = await byProduct
        .order("created_at", { ascending: false })
        .range(0, 399);
      merge((matched.data ?? []) as unknown as VariantListRow[]);
    }

    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    total = rows.length;
  }

  const pageRows = rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
  if (pageRows.length === 0) {
    return { variants: [], total };
  }

  const [pricesResult, stockResult] = await Promise.all([
    client
      .from("prices")
      .select("variant_id, price_type, amount, location_id, valid_from, valid_to")
      .in("variant_id", pageRows.map((row) => row.id))
      .order("created_at", { ascending: false }),
    fetchStockTotals(pageRows.map((row) => row.id)),
  ]);

  const pricesByVariant = new Map<string, PriceRowWithRange[]>();
  for (const price of (pricesResult.data ?? []) as unknown as PriceRowWithRange[]) {
    const variantId = price.variant_id ?? "";
    const list = pricesByVariant.get(variantId) ?? [];
    list.push(price);
    pricesByVariant.set(variantId, list);
  }

  return {
    variants: pageRows.map((row) => {
      const effective = effectiveFor(pricesByVariant.get(row.id) ?? [], row.id);
      return {
        id: row.id,
        name: row.name,
        sku: row.sku,
        barcode: row.barcode,
        status: row.status,
        options: row.options,
        productId: row.product_id,
        productName: row.products?.name ?? "Unknown product",
        productStatus: row.products?.status ?? "draft",
        sellingPrice: effective.price,
        salePrice: effective.hasSale ? effective.salePrice : null,
        stockTotal: stockResult.get(row.id) ?? 0,
      };
    }),
    total,
  };
}

async function fetchStockTotals(variantIds: string[]): Promise<Map<string, number>> {
  const totals = new Map<string, number>();
  if (!isServiceConfigured() || variantIds.length === 0) return totals;
  const service = createServiceClient();
  const { data } = await service
    .from("inventory_items")
    .select("variant_id, quantity_on_hand")
    .in("variant_id", variantIds);
  for (const row of (data ?? []) as { variant_id: string; quantity_on_hand: number }[]) {
    totals.set(row.variant_id, (totals.get(row.variant_id) ?? 0) + Number(row.quantity_on_hand));
  }
  return totals;
}

// ---------------------------------------------------------------------------
// Variant detail
// ---------------------------------------------------------------------------

export type VariantPrice = {
  id: string;
  priceType: string;
  amount: number;
  locationId: string | null;
  locationName: string | null;
  validFrom: string;
  validTo: string | null;
  period: PricePeriod;
};

export type VariantInventory = {
  locationId: string;
  locationName: string;
  quantityOnHand: number;
  reservedQuantity: number;
  reorderLevel: number | null;
};

export type VariantDetail = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  options: Record<string, unknown> | null;
  status: string;
  productId: string;
  productName: string;
  productSlug: string;
  productStatus: string;
  createdAt: string;
  updatedAt: string;
  prices: VariantPrice[];
  inventory: VariantInventory[];
  variantImages: {
    id: string;
    url: string;
    altText: string | null;
  }[];
  productImages: {
    id: string;
    url: string;
    altText: string | null;
    isPrimary: boolean;
  }[];
};

export async function getVariantById(id: string): Promise<VariantDetail | null> {
  const client = await createClient();
  const { data } = await client
    .from("product_variants")
    .select(
      "id, name, sku, barcode, options, status, created_at, updated_at, products(id, name, slug, status)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    options: Record<string, unknown> | null;
    status: string;
    created_at: string;
    updated_at: string;
    products: { id: string; name: string; slug: string; status: string } | null;
  };
  if (!row.products) return null;

  const [pricesResult, imagesResult, inventoryResult] = await Promise.all([
    client
      .from("prices")
      .select("id, price_type, amount, location_id, valid_from, valid_to")
      .eq("variant_id", id)
      .order("created_at", { ascending: false }),
    client
      .from("product_images")
      .select("id, url, alt_text, is_primary, variant_id")
      .eq("product_id", row.products.id)
      .order("sort_order", { ascending: true }),
    fetchVariantInventory(id),
  ]);

  const priceRows = (pricesResult.data ?? []) as unknown as {
    id: string;
    price_type: string;
    amount: number;
    location_id: string | null;
    valid_from: string;
    valid_to: string | null;
  }[];

  const locationIds = [
    ...new Set(
      priceRows
        .map((price) => price.location_id)
        .concat(inventoryResult.map((item) => item.locationId))
        .filter((value): value is string => value !== null),
    ),
  ];
  const locationNames = await fetchLocationNames(locationIds);

  const imageRows = (imagesResult.data ?? []) as unknown as {
    id: string;
    url: string;
    alt_text: string | null;
    is_primary: boolean;
    variant_id: string | null;
  }[];

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    options: row.options,
    status: row.status,
    productId: row.products.id,
    productName: row.products.name,
    productSlug: row.products.slug,
    productStatus: row.products.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    prices: priceRows.map((price) => ({
      id: price.id,
      priceType: price.price_type,
      amount: Number(price.amount),
      locationId: price.location_id,
      locationName: price.location_id ? (locationNames.get(price.location_id) ?? null) : null,
      validFrom: price.valid_from,
      validTo: price.valid_to,
      period: pricePeriod(price.valid_from, price.valid_to),
    })),
    inventory: inventoryResult.map((item) => ({
      ...item,
      locationName: locationNames.get(item.locationId) ?? item.locationName,
    })),
    variantImages: imageRows
      .filter((image) => image.variant_id === id)
      .map((image) => ({ id: image.id, url: image.url, altText: image.alt_text })),
    productImages: imageRows
      .filter((image) => image.variant_id === null)
      .map((image) => ({
        id: image.id,
        url: image.url,
        altText: image.alt_text,
        isPrimary: image.is_primary,
      })),
  };
}

async function fetchVariantInventory(
  variantId: string,
): Promise<VariantInventory[]> {
  if (!isServiceConfigured()) return [];
  const service = createServiceClient();
  const { data } = await service
    .from("inventory_items")
    .select(
      "location_id, quantity_on_hand, reserved_quantity, reorder_level, locations(name)",
    )
    .eq("variant_id", variantId);
  return ((data ?? []) as unknown as {
    location_id: string;
    quantity_on_hand: number;
    reserved_quantity: number;
    reorder_level: number | null;
    locations: { name: string } | null;
  }[]).map((row) => ({
    locationId: row.location_id,
    locationName: row.locations?.name ?? "Unknown location",
    quantityOnHand: Number(row.quantity_on_hand),
    reservedQuantity: Number(row.reserved_quantity),
    reorderLevel: row.reorder_level === null ? null : Number(row.reorder_level),
  }));
}

// ---------------------------------------------------------------------------
// Select options
// ---------------------------------------------------------------------------

export async function getProductsForSelect(): Promise<
  { id: string; name: string; status: string }[]
> {
  const client = await createClient();
  const { data } = await client
    .from("products")
    .select("id, name, status")
    .order("name", { ascending: true });
  return (data ?? []) as unknown as { id: string; name: string; status: string }[];
}

export async function getVariantSelectOptions(): Promise<
  { id: string; name: string; sku: string; productId: string }[]
> {
  const client = await createClient();
  const { data } = await client
    .from("product_variants")
    .select("id, name, sku, product_id")
    .order("name", { ascending: true })
    .limit(500);
  return ((data ?? []) as unknown as {
    id: string;
    name: string;
    sku: string;
    product_id: string;
  }[]).map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    productId: row.product_id,
  }));
}

// ---------------------------------------------------------------------------
// Barcodes
// ---------------------------------------------------------------------------

export type BarcodeRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  status: string;
  productId: string;
  productName: string;
};

const BARCODE_SELECT =
  "id, name, sku, barcode, status, product_id, products(name)";

type BarcodeListRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  status: string;
  product_id: string;
  created_at: string;
  products: { name: string } | null;
};

export async function getBarcodeList({
  q,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ barcodes: BarcodeRow[]; total: number }> {
  const client = await createClient();
  const term = q?.trim() ?? "";

  const rows: BarcodeListRow[] = [];
  let total = 0;

  if (term === "") {
    const { data, count } = await client
      .from("product_variants")
      .select(BARCODE_SELECT, { count: "exact" })
      .order("created_at", { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);
    rows.push(...((data ?? []) as unknown as BarcodeListRow[]));
    total = count ?? rows.length;
  } else {
    const seen = new Set<string>();
    const merge = (candidates: BarcodeListRow[]) => {
      for (const row of candidates) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        rows.push(row);
      }
    };

    const direct = await client
      .from("product_variants")
      .select(BARCODE_SELECT)
      .or(`barcode.ilike.%${term}%,sku.ilike.%${term}%,name.ilike.%${term}%`)
      .order("created_at", { ascending: false })
      .range(0, 399);
    merge((direct.data ?? []) as unknown as BarcodeListRow[]);

    const productsResult = await client
      .from("products")
      .select("id")
      .ilike("name", `%${term}%`)
      .limit(50);
    const productIds = ((productsResult.data ?? []) as { id: string }[]).map(
      (row) => row.id,
    );
    if (productIds.length > 0) {
      const byProduct = await client
        .from("product_variants")
        .select(BARCODE_SELECT)
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
        .range(0, 399);
      merge((byProduct.data ?? []) as unknown as BarcodeListRow[]);
    }

    rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
    total = rows.length;
  }

  return {
    barcodes: rows
      .slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)
      .map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        barcode: row.barcode,
        status: row.status,
        productId: row.product_id,
        productName: row.products?.name ?? "Unknown product",
      })),
    total,
  };
}

/**
 * Exact barcode lookup — the same resolution POS uses
 * (lib/pos/catalogue.ts searches with `.eq("barcode", ...)`).
 * Resolves regardless of product/variant status so inactive records
 * still surface when scanned.
 */
export async function resolveBarcode(barcode: string): Promise<BarcodeRow | null> {
  const term = barcode.trim();
  if (term === "" || !isServiceConfigured()) return null;
  const service = createServiceClient();
  const { data } = await service
    .from("product_variants")
    .select(BARCODE_SELECT)
    .eq("barcode", term)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    status: string;
    product_id: string;
    products: { name: string } | null;
  };
  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    status: row.status,
    productId: row.product_id,
    productName: row.products?.name ?? "Unknown product",
  };
}

export async function getBarcodeCounts(): Promise<{
  assigned: number;
  unassigned: number;
}> {
  if (!isServiceConfigured()) return { assigned: 0, unassigned: 0 };
  const service = createServiceClient();
  const [assignedResult, unassignedResult] = await Promise.all([
    service
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .not("barcode", "is", null),
    service
      .from("product_variants")
      .select("id", { count: "exact", head: true })
      .is("barcode", null),
  ]);
  return {
    assigned: assignedResult.count ?? 0,
    unassigned: unassignedResult.count ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Price lists
// ---------------------------------------------------------------------------

export type PriceListItem = {
  id: string;
  productId: string | null;
  variantId: string | null;
  priceType: string;
  amount: number;
  locationId: string | null;
  locationName: string | null;
  validFrom: string;
  validTo: string | null;
  period: PricePeriod;
  productName: string;
  variantName: string | null;
  sku: string | null;
};

type PriceListRow = {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  price_type: string;
  amount: number;
  location_id: string | null;
  valid_from: string;
  valid_to: string | null;
  products: { name: string } | null;
  product_variants: { name: string; sku: string } | null;
};

const PRICE_LIST_SELECT =
  "id, product_id, variant_id, price_type, amount, location_id, valid_from, valid_to, products(name), product_variants(name, sku)";

const PRICE_PERIODS = ["active", "future", "expired"] as const;

export async function getPriceList({
  q,
  priceType,
  locationId,
  period,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  priceType?: string;
  locationId?: string;
  period?: string;
  page?: number;
  pageSize?: number;
}): Promise<{
  prices: PriceListItem[];
  total: number;
  counts: Record<PricePeriod, number>;
}> {
  const client = await createClient();
  const term = q?.trim() ?? "";
  const activePeriod = PRICE_PERIODS.includes(period as PricePeriod)
    ? (period as PricePeriod)
    : null;

  const now = new Date();
  const nowIso = now.toISOString();

  const searchClause = await buildPriceSearchClause(client, term);

  const countFor = async (countPeriod: PricePeriod): Promise<number> => {
    let query = client.from("prices").select("id", { count: "exact", head: true });
    if (searchClause) query = query.or(searchClause);
    if (priceType) query = query.eq("price_type", priceType);
    if (locationId) query = query.eq("location_id", locationId);
    if (countPeriod === "active") {
      query = query.lte("valid_from", nowIso).or(`valid_to.is.null,valid_to.gte."${nowIso}"`);
    } else if (countPeriod === "future") {
      query = query.gt("valid_from", nowIso);
    } else {
      query = query.lt("valid_to", nowIso).not("valid_to", "is", null);
    }
    const { count } = await query;
    return count ?? 0;
  };

  const counts: Record<PricePeriod, number> = { active: 0, future: 0, expired: 0 };
  if (searchClause !== null) {
    const [activeCount, futureCount, expiredCount] = await Promise.all([
      countFor("active"),
      countFor("future"),
      countFor("expired"),
    ]);
    counts.active = activeCount;
    counts.future = futureCount;
    counts.expired = expiredCount;
  }

  if (searchClause === null) {
    return { prices: [], total: 0, counts };
  }

  let query = client.from("prices").select(PRICE_LIST_SELECT, { count: "exact" });
  if (searchClause) query = query.or(searchClause);
  if (priceType) query = query.eq("price_type", priceType);
  if (locationId) query = query.eq("location_id", locationId);
  if (activePeriod === "active") {
    query = query.lte("valid_from", nowIso).or(`valid_to.is.null,valid_to.gte."${nowIso}"`);
  } else if (activePeriod === "future") {
    query = query.gt("valid_from", nowIso);
  } else if (activePeriod === "expired") {
    query = query.lt("valid_to", nowIso).not("valid_to", "is", null);
  }
  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as PriceListRow[];
  const locationIds = [
    ...new Set(rows.map((row) => row.location_id).filter((value): value is string => value !== null)),
  ];
  const locationNames = await fetchLocationNames(locationIds);

  return {
    prices: rows.map((row) => ({
      id: row.id,
      productId: row.product_id,
      variantId: row.variant_id,
      priceType: row.price_type,
      amount: Number(row.amount),
      locationId: row.location_id,
      locationName: row.location_id ? (locationNames.get(row.location_id) ?? null) : null,
      validFrom: row.valid_from,
      validTo: row.valid_to,
      period: pricePeriod(row.valid_from, row.valid_to),
      productName: row.products?.name ?? "Unknown product",
      variantName: row.product_variants?.name ?? null,
      sku: row.product_variants?.sku ?? null,
    })),
    total: count ?? 0,
    counts,
  };
}

async function buildPriceSearchClause(
  client: Awaited<ReturnType<typeof createClient>>,
  term: string,
): Promise<string | null> {
  if (term === "") return "";
  const like = `%${term}%`;
  const [variantsResult, productsResult] = await Promise.all([
    client
      .from("product_variants")
      .select("id")
      .or(`name.ilike.${like},sku.ilike.${like}`)
      .limit(100),
    client.from("products").select("id").ilike("name", like).limit(100),
  ]);
  const variantIds = ((variantsResult.data ?? []) as { id: string }[]).map(
    (row) => row.id,
  );
  const productIds = ((productsResult.data ?? []) as { id: string }[]).map(
    (row) => row.id,
  );
  if (variantIds.length === 0 && productIds.length === 0) return null;
  const parts: string[] = [];
  if (variantIds.length > 0) parts.push(`variant_id.in.(${variantIds.join(",")})`);
  if (productIds.length > 0) parts.push(`product_id.in.(${productIds.join(",")})`);
  return parts.join(",");
}

export async function getPriceById(id: string): Promise<PriceListItem | null> {
  const client = await createClient();
  const { data } = await client
    .from("prices")
    .select(PRICE_LIST_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const row = data as unknown as PriceListRow;
  const locationNames = await fetchLocationNames(
    row.location_id ? [row.location_id] : [],
  );
  return {
    id: row.id,
    productId: row.product_id,
    variantId: row.variant_id,
    priceType: row.price_type,
    amount: Number(row.amount),
    locationId: row.location_id,
    locationName: row.location_id ? (locationNames.get(row.location_id) ?? null) : null,
    validFrom: row.valid_from,
    validTo: row.valid_to,
    period: pricePeriod(row.valid_from, row.valid_to),
    productName: row.products?.name ?? "Unknown product",
    variantName: row.product_variants?.name ?? null,
    sku: row.product_variants?.sku ?? null,
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function fetchLocationNames(
  locationIds: string[],
): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  if (!isServiceConfigured() || locationIds.length === 0) return names;
  const service = createServiceClient();
  const { data } = await service
    .from("locations")
    .select("id, name")
    .in("id", locationIds);
  for (const row of (data ?? []) as { id: string; name: string }[]) {
    names.set(row.id, row.name);
  }
  return names;
}

export async function getPriceLocations(): Promise<{ id: string; name: string }[]> {
  if (!isServiceConfigured()) return [];
  const service = createServiceClient();
  const { data } = await service
    .from("locations")
    .select("id, name")
    .order("name", { ascending: true });
  return (data ?? []) as unknown as { id: string; name: string }[];
}