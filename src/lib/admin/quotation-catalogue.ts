"use server";

import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { effectivePricing, pricingFor, type PriceRow } from "@/lib/pricing";

/**
 * Catalogue search for the quotation editor.
 *
 * Runs through the service-role client because products/prices RLS is gated
 * behind products.read, which a sales role may not hold (same documented
 * precedent as the POS catalogue, lib/pos/catalogue.ts). Authorization is
 * enforced at the action boundary (sales.read) and in the page guards.
 */

type PriceRowWithRange = PriceRow & {
  valid_from: string;
  valid_to: string | null;
};

export type QuotationCatalogueItem = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  options: Record<string, string> | null;
  /** Authoritative current effective price (selling or sale). */
  price: number;
  salePrice: number | null;
};

type CatalogueVariantRow = {
  id: string;
  name: string;
  sku: string;
  options: Record<string, string> | null;
  status: string;
  product: { id: string; name: string; status: string } | null;
  prices: PriceRowWithRange[];
};

const CATALOGUE_SELECT = `
  id, name, sku, options, status,
  product:products(id, name, status),
  prices(price_type, amount, variant_id, valid_from, valid_to)
`;

function currentPrices(rows: PriceRowWithRange[]): PriceRowWithRange[] {
  const now = Date.now();
  return rows.filter((price) => {
    const from = price.valid_from ? new Date(price.valid_from).getTime() : 0;
    const to = price.valid_to ? new Date(price.valid_to).getTime() : null;
    return from <= now && (to === null || to >= now);
  });
}

export async function searchQuotationCatalogueAction(
  q: string,
): Promise<QuotationCatalogueItem[]> {
  if (!isServiceConfigured()) return [];
  const service = createServiceClient();
  const term = q.trim();
  if (term === "") return [];

  const like = `%${term}%`;
  const results: CatalogueVariantRow[] = [];

  const variantsResult = await service
    .from("product_variants")
    .select(CATALOGUE_SELECT)
    .eq("status", "active")
    .eq("product.status", "active")
    .or(`name.ilike.${like},sku.ilike.${like}`)
    .limit(40);
  if (!variantsResult.error) {
    results.push(...((variantsResult.data ?? []) as unknown as CatalogueVariantRow[]));
  }

  const productsResult = await service
    .from("products")
    .select("id")
    .eq("status", "active")
    .ilike("name", like)
    .limit(40);
  const productIds = ((productsResult.data ?? []) as { id: string }[]).map(
    (row) => row.id,
  );
  if (productIds.length > 0) {
    const byProduct = await service
      .from("product_variants")
      .select(CATALOGUE_SELECT)
      .eq("status", "active")
      .in("product_id", productIds)
      .limit(40);
    if (!byProduct.error) {
      results.push(...((byProduct.data ?? []) as unknown as CatalogueVariantRow[]));
    }
  }

  const seen = new Set<string>();
  const items: QuotationCatalogueItem[] = [];
  for (const row of results) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    if (row.status !== "active" || !row.product || row.product.status !== "active") {
      continue;
    }
    const effective = effectivePricing(
      pricingFor(currentPrices(row.prices ?? []), row.id),
    );
    if (effective.price === null) continue;
    items.push({
      variantId: row.id,
      productName: row.product.name,
      variantName: row.name,
      sku: row.sku,
      options: row.options,
      price: effective.price,
      salePrice: effective.salePrice,
    });
    if (items.length >= 30) break;
  }
  return items.sort(
    (a, b) =>
      a.productName.localeCompare(b.productName) ||
      a.variantName.localeCompare(b.variantName),
  );
}