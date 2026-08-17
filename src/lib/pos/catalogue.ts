"use server";

import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { effectivePricing, pricingFor, type PriceRow } from "@/lib/pricing";
import type {
  PosCatalogueItem,
  PosCategory,
  PosLocation,
} from "./types";
import { POS_CATALOGUE_LIMIT } from "./types";

/**
 * POS catalogue access.
 *
 * Reads run through the service-role client because the public RLS policies
 * gate products/inventory/locations behind products.read, inventory.read and
 * settings.manage — permissions a cashier role may not hold. Authorization
 * is enforced at the action/page boundary instead (sales.read to open the
 * register, sales.create to complete a sale), mirroring the existing
 * service-client precedents in lib/orders.ts and lib/payments/record.ts.
 */

type PriceRowWithRange = PriceRow & {
  valid_from: string;
  valid_to: string | null;
};

type VariantRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  status: string;
  product: {
    id: string;
    name: string;
    status: string;
    category_id: string | null;
    categories: { name: string } | null;
  } | null;
  prices: PriceRowWithRange[];
  inventory: {
    location_id: string;
    quantity_on_hand: number;
    reserved_quantity: number;
  }[] | null;
  images: { url: string; is_primary: boolean }[] | null;
};

const VARIANT_SELECT = `
  id, name, sku, barcode, status,
  product:products(id, name, status, category_id, categories(name)),
  prices(price_type, amount, variant_id, valid_from, valid_to),
  inventory:inventory_items(location_id, quantity_on_hand, reserved_quantity),
  images:product_images(url, is_primary)
`;

function currentPrices(rows: PriceRowWithRange[]): PriceRowWithRange[] {
  const now = Date.now();
  return rows.filter((price) => {
    const from = price.valid_from ? new Date(price.valid_from).getTime() : 0;
    const to = price.valid_to ? new Date(price.valid_to).getTime() : null;
    return from <= now && (to === null || to >= now);
  });
}

function primaryImageUrl(
  images: { url: string; is_primary: boolean }[] | null | undefined,
): string | null {
  if (!images || images.length === 0) return null;
  const primary = images.find((image) => image.is_primary) ?? images[0];
  return primary?.url ?? null;
}

function toCatalogueItem(row: VariantRow, locationId: string | null): PosCatalogueItem | null {
  if (row.status !== "active" || !row.product || row.product.status !== "active") {
    return null;
  }
  const effective = effectivePricing(
    pricingFor(currentPrices(row.prices ?? []), row.id),
  );
  if (effective.price === null) return null;

  const atLocation =
    (row.inventory ?? []).find((entry) => entry.location_id === locationId) ??
    (row.inventory ?? [])[0] ??
    null;
  const onHand = atLocation ? Number(atLocation.quantity_on_hand) : 0;
  const reserved = atLocation ? Number(atLocation.reserved_quantity) : 0;

  return {
    variantId: row.id,
    productId: row.product.id,
    productName: row.product.name,
    variantName: row.name,
    sku: row.sku,
    barcode: row.barcode,
    categoryId: row.product.category_id,
    categoryName: row.product.categories?.name ?? null,
    price: effective.price,
    salePrice: effective.salePrice,
    available: Math.max(0, Math.round((onHand - reserved) * 1000) / 1000),
    imageUrl: primaryImageUrl(row.images),
  };
}

function sortItems(items: PosCatalogueItem[]): PosCatalogueItem[] {
  return items.sort(
    (a, b) =>
      a.productName.localeCompare(b.productName) ||
      a.variantName.localeCompare(b.variantName),
  );
}

export async function getPosLocations(): Promise<PosLocation[]> {
  if (!isServiceConfigured()) return [];
  const service = createServiceClient();
  const { data } = await service
    .from("locations")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

export async function getPosCategories(): Promise<PosCategory[]> {
  if (!isServiceConfigured()) return [];
  const service = createServiceClient();
  const { data } = await service
    .from("categories")
    .select("id, name")
    .eq("status", "active")
    .order("name", { ascending: true });
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
  }));
}

/** Initial register catalogue (sellable variants, capped and sorted in JS). */
export async function getPosCatalogueSeed(
  locationId: string | null,
): Promise<PosCatalogueItem[]> {
  if (!isServiceConfigured()) return [];
  const service = createServiceClient();
  const { data, error } = await service
    .from("product_variants")
    .select(VARIANT_SELECT)
    .eq("status", "active")
    .eq("product.status", "active")
    .limit(POS_CATALOGUE_LIMIT * 4);
  if (error) return [];
  const items: PosCatalogueItem[] = [];
  for (const row of (data ?? []) as unknown as VariantRow[]) {
    const item = toCatalogueItem(row, locationId);
    if (item) items.push(item);
  }
  return sortItems(items).slice(0, POS_CATALOGUE_LIMIT);
}

export type PosSearchParams = {
  q?: string;
  categoryId?: string | null;
  barcode?: string;
  locationId?: string | null;
  limit?: number;
};

/**
 * Search sellable variants by product name, variant name, SKU or barcode.
 * Embedded-resource `or()` filters are not supported by PostgREST here, so
 * the product-name path is resolved via a separate products query and the
 * results are merged and sorted in JS.
 */
export async function searchPosCatalogueAction(
  params: PosSearchParams,
): Promise<PosCatalogueItem[]> {
  if (!isServiceConfigured()) return [];

  const limit = Math.min(params.limit ?? POS_CATALOGUE_LIMIT, 96);
  const service = createServiceClient();
  const q = params.q?.trim() ?? "";
  const categoryId = params.categoryId?.trim() || null;

  // PostgREST types: select() returns a filter chain that supports further
  // filters, so all variant queries start from this chain.
  const baseVariantQuery = () =>
    service
      .from("product_variants")
      .select(VARIANT_SELECT)
      .eq("status", "active")
      .eq("product.status", "active");

  const categoryFilter = (query: ReturnType<typeof baseVariantQuery>) =>
    categoryId ? query.eq("product.category_id", categoryId) : query;

  const rows: VariantRow[] = [];
  const runVariant = async (query: ReturnType<typeof baseVariantQuery>) => {
    const { data, error } = await query;
    if (!error) {
      rows.push(...((data ?? []) as unknown as VariantRow[]));
    }
  };

  if (params.barcode?.trim()) {
    const { data, error } = await service
      .from("product_variants")
      .select(VARIANT_SELECT)
      .eq("barcode", params.barcode.trim());
    if (!error) {
      rows.push(...((data ?? []) as unknown as VariantRow[]));
    }
  } else if (q) {
    const term = `%${q}%`;
    await runVariant(
      categoryFilter(
        baseVariantQuery()
          .or(`name.ilike.${term},sku.ilike.${term},barcode.ilike.${term}`)
          .limit(limit * 2),
      ),
    );

    // Product-name matches resolve through a separate products query because
    // PostgREST here does not support embedded-resource or() filters.
    let productsQuery = service
      .from("products")
      .select("id")
      .eq("status", "active")
      .ilike("name", term);
    if (categoryId) productsQuery = productsQuery.eq("category_id", categoryId);
    const productsResult = await productsQuery.limit(96);
    const productIds = ((productsResult.data ?? []) as { id: string }[]).map(
      (row) => row.id,
    );
    if (productIds.length > 0) {
      await runVariant(
        baseVariantQuery().in("product_id", productIds).limit(limit * 2),
      );
    }
  } else if (categoryId) {
    // Category browse — resolve product ids first (same embedded-filter
    // limitation), then fetch their variants.
    const productsResult = await service
      .from("products")
      .select("id")
      .eq("status", "active")
      .eq("category_id", categoryId)
      .limit(200);
    const productIds = ((productsResult.data ?? []) as { id: string }[]).map(
      (row) => row.id,
    );
    if (productIds.length > 0) {
      await runVariant(
        baseVariantQuery().in("product_id", productIds).limit(limit * 4),
      );
    }
  } else {
    await runVariant(baseVariantQuery().limit(limit * 4));
  }

  const seen = new Set<string>();
  const items: PosCatalogueItem[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const item = toCatalogueItem(row, params.locationId ?? null);
    if (item) items.push(item);
    if (items.length >= limit) break;
  }
  return sortItems(items).slice(0, limit);
}