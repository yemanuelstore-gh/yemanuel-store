import { createClient } from "@/lib/supabase/server";

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  status: string;
  categoryName: string | null;
  brandName: string | null;
  primarySku: string | null;
  firstVariantId: string | null;
  sellingPrice: number | null;
  variantsCount: number;
  updatedAt: string;
};

type ProductRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  updated_at: string;
  categories: { name: string } | null;
  brands: { name: string } | null;
};

export async function getProducts({
  q,
  categoryId,
  brandId,
  status,
  page,
  pageSize = 25,
}: {
  q?: string;
  categoryId?: string;
  brandId?: string;
  status?: string;
  page: number;
  pageSize?: number;
}): Promise<{ products: ProductListItem[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("products")
    .select(
      "id, name, slug, status, updated_at, categories(name), brands(name)",
      { count: "exact" },
    );

  if (q && q.trim() !== "") {
    query = query.ilike("name", `%${q.trim()}%`);
  }
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  if (brandId) {
    query = query.eq("brand_id", brandId);
  }
  if (status) {
    query = query.eq("status", status);
  }

  const { data, count } = await query
    .order("updated_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as ProductRow[];
  if (rows.length === 0) {
    return { products: [], total: count ?? 0 };
  }

  const productIds = rows.map((row) => row.id);

  const [variantsResult] = await Promise.all([
    client
      .from("product_variants")
      .select("id, product_id, name, sku")
      .in("product_id", productIds),
  ]);

  let variantsByProduct = new Map<string, { id: string; name: string; sku: string }[]>();
  if (variantsResult.data && variantsResult.data.length > 0) {
    const variantIds = variantsResult.data.map((v) => v.id);
    const priceRows = await client
      .from("prices")
      .select("variant_id, amount")
      .eq("price_type", "selling")
      .in("variant_id", variantIds)
      .order("created_at", { ascending: false });

    const priceByVariant = new Map<string, number>();
    for (const price of priceRows.data ?? []) {
      if (!priceByVariant.has(price.variant_id)) {
        priceByVariant.set(price.variant_id, Number(price.amount));
      }
    }

    const grouped = new Map<string, { id: string; name: string; sku: string }[]>();
    for (const variant of variantsResult.data as { id: string; product_id: string; name: string; sku: string }[]) {
      const list = grouped.get(variant.product_id) ?? [];
      list.push({ id: variant.id, name: variant.name, sku: variant.sku });
      grouped.set(variant.product_id, list);
    }
    variantsByProduct = grouped;

    const firstPriceByProduct = new Map<string, number>();
    for (const variant of variantsResult.data) {
      const price = priceByVariant.get(variant.id);
      if (price !== undefined) {
        firstPriceByProduct.set(variant.product_id, price);
      }
    }

    return {
      products: rows.map((row) => {
        const variants = variantsByProduct.get(row.id) ?? [];
        const first = variants[0];
        return {
          id: row.id,
          name: row.name,
          slug: row.slug,
          status: row.status,
          categoryName: row.categories?.name ?? null,
          brandName: row.brands?.name ?? null,
          primarySku: first?.sku ?? null,
          firstVariantId: first?.id ?? null,
          sellingPrice: firstPriceByProduct.get(row.id) ?? null,
          variantsCount: variants.length,
          updatedAt: row.updated_at,
        };
      }),
      total: count ?? 0,
    };
  }

  return {
    products: rows.map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      status: row.status,
      categoryName: row.categories?.name ?? null,
      brandName: row.brands?.name ?? null,
      primarySku: null,
      firstVariantId: null,
      sellingPrice: null,
      variantsCount: 0,
      updatedAt: row.updated_at,
    })),
    total: count ?? 0,
  };
}

export type VariantWithPrices = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  options: Record<string, unknown> | null;
  status: string;
  prices: { id: string; priceType: string; amount: number; locationId: string | null; validFrom: string; validTo: string | null }[];
};

export async function getVariantsForProduct(productId: string): Promise<VariantWithPrices[]> {
  const client = await createClient();
  const { data } = await client
    .from("product_variants")
    .select("id, name, sku, barcode, options, status")
    .eq("product_id", productId)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    options: Record<string, unknown> | null;
    status: string;
  }[];

  if (rows.length === 0) return [];

  const pricesResult = await client
    .from("prices")
    .select("id, variant_id, price_type, amount, location_id, valid_from, valid_to")
    .in("variant_id", rows.map((row) => row.id))
    .order("created_at", { ascending: false });

  const pricesByVariant = new Map<string, VariantWithPrices["prices"]>();
  for (const price of (pricesResult.data ?? []) as unknown as {
    id: string;
    variant_id: string;
    price_type: string;
    amount: number;
    location_id: string | null;
    valid_from: string;
    valid_to: string | null;
  }[]) {
    const list = pricesByVariant.get(price.variant_id) ?? [];
    list.push({
      id: price.id,
      priceType: price.price_type,
      amount: Number(price.amount),
      locationId: price.location_id,
      validFrom: price.valid_from,
      validTo: price.valid_to,
    });
    pricesByVariant.set(price.variant_id, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    barcode: row.barcode,
    options: row.options,
    status: row.status,
    prices: pricesByVariant.get(row.id) ?? [],
  }));
}

export type ProductImages = {
  id: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export async function getProductImages(productId: string): Promise<ProductImages[]> {
  const client = await createClient();
  const { data } = await client
    .from("product_images")
    .select("id, url, alt_text, sort_order, is_primary")
    .eq("product_id", productId)
    .order("sort_order", { ascending: true });

  return ((data ?? []) as unknown as {
    id: string;
    url: string;
    alt_text: string | null;
    sort_order: number;
    is_primary: boolean;
  }[]).map((row) => ({
    id: row.id,
    url: row.url,
    altText: row.alt_text,
    sortOrder: row.sort_order,
    isPrimary: row.is_primary,
  }));
}

export async function getCategoriesForSelect(): Promise<{ id: string; name: string }[]> {
  const client = await createClient();
  const { data } = await client
    .from("categories")
    .select("id, name")
    .order("name", { ascending: true });
  return (data ?? []) as unknown as { id: string; name: string }[];
}

export async function getBrandsForSelect(): Promise<{ id: string; name: string }[]> {
  const client = await createClient();
  const { data } = await client
    .from("brands")
    .select("id, name")
    .order("name", { ascending: true });
  return (data ?? []) as unknown as { id: string; name: string }[];
}

export async function getProductById(id: string) {
  const client = await createClient();
  const { data, error } = await client
    .from("products")
    .select(
      "id, name, slug, description, status, category_id, brand_id, created_at, updated_at, categories(name), brands(name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
    category_id: string;
    brand_id: string | null;
    created_at: string;
    updated_at: string;
    categories: { name: string } | null;
    brands: { name: string } | null;
  };
}

export async function getLocationsForSelect(): Promise<{ id: string; name: string }[]> {
  const client = await createClient();
  const { data } = await client
    .from("locations")
    .select("id, name")
    .order("name", { ascending: true });
  return (data ?? []) as unknown as { id: string; name: string }[];
}