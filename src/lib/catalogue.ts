import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import {
  effectivePricing,
  pricingFor,
  type PriceRow,
} from "@/lib/pricing";

export type CategorySummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
  parentId: string | null;
};

export type BrandSummary = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  productCount: number;
};

export type ShopProduct = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categorySlug: string | null;
  categoryName: string | null;
  brandSlug: string | null;
  brandName: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  variantCount: number;
  price: number | null;
  salePrice: number | null;
  hasSale: boolean;
  available: boolean;
  createdAt: string;
};

export type ProductOption = { key: string; value: string };

export type ProductImageItem = { url: string; altText: string | null };

export type ProductVariantDetail = {
  id: string;
  name: string;
  sku: string;
  options: ProductOption[];
  images: ProductImageItem[];
  price: number | null;
  salePrice: number | null;
  hasSale: boolean;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  category: { name: string; slug: string } | null;
  brand: { name: string; slug: string } | null;
  productImages: ProductImageItem[];
  variants: ProductVariantDetail[];
  available: boolean;
};

export type CartProductLine = {
  variantId: string;
  sku: string;
  variantName: string;
  optionLabels: ProductOption[];
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  imageAlt: string | null;
  price: number | null;
  salePrice: number | null;
  hasSale: boolean;
  available: boolean;
};

export type ShopSort = "newest" | "price-asc" | "price-desc" | "name";

export type ShopQuery = {
  category?: string;
  brand?: string;
  query?: string;
  sort?: ShopSort;
  limit?: number;
};

type ImageRow = {
  url: string;
  alt_text: string | null;
  is_primary: boolean | null;
  sort_order: number | null;
  variant_id: string | null;
};

type VariantRow = {
  id: string;
  name: string;
  sku: string;
  options: Record<string, string> | null;
  prices: PriceRow[];
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  created_at: string;
  category_id: string | null;
  category: { name: string; slug: string } | null;
  brand: { name: string; slug: string } | null;
  product_variants: VariantRow[];
  product_images: ImageRow[];
};

const PRODUCT_SELECT = `
  id, slug, name, description, created_at, category_id,
  category:categories(name, slug),
  brand:brands(name, slug),
  product_variants(id, name, sku, options, prices(price_type, amount, variant_id)),
  product_images(url, alt_text, is_primary, sort_order, variant_id)
`;

async function catalogueClient() {
  if (!isSupabaseConfigured()) {
    fail(
      "Supabase is not configured. Copy .env.example to .env.local and add your Supabase project values.",
    );
  }
  return createClient();
}

/**
 * Log a catalogue failure to the server console before re-throwing, so
 * configuration / database errors are never silently swallowed into
 * "0 products" by the storefront.
 */
function fail(message: string): never {
  console.error(`[catalogue] ${message}`);
  throw new Error(message);
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function sortImages(images: ImageRow[]): ImageRow[] {
  return [...images].sort((a, b) => {
    const aPrimary = a.is_primary ? 1 : 0;
    const bPrimary = b.is_primary ? 1 : 0;
    if (aPrimary !== bPrimary) return bPrimary - aPrimary;
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  });
}

function primaryImage(
  images: ImageRow[],
): { url: string | null; altText: string | null } {
  const productImages = images.filter((image) => image.variant_id === null);
  const pool = productImages.length > 0 ? productImages : images;
  const primary = sortImages(pool)[0];
  return primary
    ? { url: primary.url, altText: primary.alt_text }
    : { url: null, altText: null };
}

type Pricing = { selling: number | null; sale: number | null };

/**
 * Prices are stored at variant level (prices.product_id is always null), so
 * the cheapest candidate price across every variant is the product price.
 */
function cheapestPricing(variants: VariantRow[]): Pricing {
  let selling: number | null = null;
  let sale: number | null = null;
  for (const variant of variants) {
    const pricing = pricingFor(variant.prices, variant.id);
    if (pricing.selling !== null && (selling === null || pricing.selling < selling)) {
      selling = pricing.selling;
      sale = pricing.sale;
    }
  }
  return { selling, sale };
}

function mapShopProduct(row: ProductRow): ShopProduct {
  const candidates: { price: number; salePrice: number | null }[] = [];
  const collect = (pricing: Pricing) => {
    const effective = effectivePricing(pricing);
    if (effective.price !== null) {
      candidates.push({ price: effective.price, salePrice: effective.salePrice });
    }
  };
  collect(cheapestPricing(row.product_variants));

  let price: number | null = null;
  let salePrice: number | null = null;
  for (const candidate of candidates) {
    if (price === null || candidate.price < price) {
      price = candidate.price;
      salePrice = candidate.salePrice;
    }
  }

  const { url, altText } = primaryImage(row.product_images);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    categorySlug: row.category?.slug ?? null,
    categoryName: row.category?.name ?? null,
    brandSlug: row.brand?.slug ?? null,
    brandName: row.brand?.name ?? null,
    imageUrl: url,
    imageAlt: altText,
    variantCount: row.product_variants.length,
    price,
    salePrice,
    hasSale: salePrice !== null,
    available: row.product_variants.length > 0,
    createdAt: row.created_at,
  };
}

export const getCatalogueCounts = cache(async (): Promise<{
  categoryCounts: Map<string, number>;
  brandCounts: Map<string, number>;
}> => {
  const client = await catalogueClient();
  const categoryCounts = new Map<string, number>();
  const brandCounts = new Map<string, number>();
  // PostgREST returns at most 1,000 rows per request, so page through
  // every active product once and tally counts client-side.
  for (let offset = 0; offset <= 200_000; offset += PRODUCT_FETCH_CHUNK) {
    const { data, error } = await client
      .from("products")
      .select("category_id, brand_id")
      .eq("status", "active")
      .range(offset, offset + PRODUCT_FETCH_CHUNK - 1);
    if (error) {
      fail(`Failed to load catalogue counts: ${error.message}`);
    }
    for (const row of data ?? []) {
      if (row.category_id) {
        categoryCounts.set(
          row.category_id,
          (categoryCounts.get(row.category_id) ?? 0) + 1,
        );
      }
      if (row.brand_id) {
        brandCounts.set(
          row.brand_id,
          (brandCounts.get(row.brand_id) ?? 0) + 1,
        );
      }
    }
    if ((data ?? []).length < PRODUCT_FETCH_CHUNK) break;
  }
  return { categoryCounts, brandCounts };
});

/**
 * PostgREST caps a single request at 1,000 rows; count queries must page.
 */
const PRODUCT_FETCH_CHUNK = 1000;

export const getCategories = cache(async (): Promise<CategorySummary[]> => {
  const client = await catalogueClient();
  const [categoriesResult, { categoryCounts: counts }] = await Promise.all([
    client
      .from("categories")
      .select("id, name, slug, description, image_url, parent_id")
      .eq("status", "active")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    getCatalogueCounts(),
  ]);
  if (categoriesResult.error) {
    fail(`Failed to load categories: ${categoriesResult.error.message}`);
  }

  const categories = (categoriesResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    imageUrl: row.image_url ?? null,
    parentId: row.parent_id ?? null,
  }));

  // A category's product count includes products in every descendant
  // category of its tree, so parent/department counts reflect the whole
  // subtree instead of just products directly assigned to that category.
  const descendants = childrenByParent(categories);
  const subtreeCount = (categoryId: string): number => {
    let total = counts.get(categoryId) ?? 0;
    for (const childId of descendants.get(categoryId) ?? []) {
      total += subtreeCount(childId);
    }
    return total;
  };

  return categories.map((category) => ({
    ...category,
    productCount: subtreeCount(category.id),
  }));
});

/**
 * Map of parent category id -> immediate child category ids.
 */
function childrenByParent(
  categories: Array<{ id: string; parentId: string | null }>,
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const siblings = map.get(category.parentId) ?? [];
    siblings.push(category.id);
    map.set(category.parentId, siblings);
  }
  return map;
}

/**
 * All descendant category ids of the given root (children, grandchildren,
 * ...), excluding the root itself. Used to scope catalogue queries to a
 * whole department subtree.
 */
export function descendantCategoryIds(
  categories: CategorySummary[],
  rootId: string | null,
): string[] {
  if (!rootId) return [];
  const descendants = childrenByParent(categories);
  const ids: string[] = [];
  const frontier = [rootId];
  while (frontier.length > 0) {
    const current = frontier.shift() as string;
    for (const childId of descendants.get(current) ?? []) {
      ids.push(childId);
      frontier.push(childId);
    }
  }
  return ids;
}

export const getBrands = cache(async (): Promise<BrandSummary[]> => {
  const client = await catalogueClient();
  const [brandsResult, { brandCounts: counts }] = await Promise.all([
    client
      .from("brands")
      .select("id, name, slug, description")
      .eq("status", "active")
      .order("name", { ascending: true }),
    getCatalogueCounts(),
  ]);
  if (brandsResult.error) {
    fail(`Failed to load brands: ${brandsResult.error.message}`);
  }

  return (brandsResult.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description ?? null,
    productCount: counts.get(row.id) ?? 0,
  }));
});

export const getCategoryBySlug = cache(
  async (slug: string): Promise<CategorySummary | null> => {
    const categories = await getCategories();
    return categories.find((item) => item.slug === slug) ?? null;
  },
);

export const getChildCategories = cache(
  async (parentId: string): Promise<CategorySummary[]> => {
    const categories = await getCategories();
    return categories.filter((item) => item.parentId === parentId);
  },
);

export const getBrandBySlug = cache(
  async (slug: string): Promise<BrandSummary | null> => {
    const brands = await getBrands();
    return brands.find((item) => item.slug === slug) ?? null;
  },
);

export type ShopPageResult = {
  products: ShopProduct[];
  total: number;
};

const PRICE_SORT_FETCH_CAP = 500;

export const getShopProductsPage = cache(
  async ({
    category,
    brand,
    query,
    sort = "newest",
    page = 1,
    pageSize = 48,
  }: ShopQuery & { page?: number; pageSize?: number } = {}): Promise<ShopPageResult> => {
    const client = await catalogueClient();

    const safePage = Math.max(1, Math.floor(page) || 1);
    const safePageSize = Math.min(
      200,
      Math.max(1, Math.floor(pageSize) || 1),
    );

    const sortByPrice = sort === "price-asc" || sort === "price-desc";

    let request = client
      .from("products")
      .select(PRODUCT_SELECT, { count: "exact" })
      .eq("status", "active");

    if (sortByPrice) {
      request = request
        .order("created_at", { ascending: false })
        .limit(PRICE_SORT_FETCH_CAP);
    } else if (sort === "name") {
      request = request.order("name", { ascending: true });
    } else {
      request = request.order("created_at", { ascending: false });
    }

    if (category) {
      const categories = await getCategories();
      const match = categories.find((item) => item.slug === category);
      if (!match) return { products: [], total: 0 };
      request = request.in("category_id", [
        match.id,
        ...descendantCategoryIds(categories, match.id),
      ]);
    }

    if (brand) {
      const brands = await getBrands();
      const match = brands.find((item) => item.slug === brand);
      if (!match) return { products: [], total: 0 };
      request = request.eq("brand_id", match.id);
    }

    if (query) {
      const escaped = escapeLike(query.trim());
      request = request.or(
        `name.ilike.%${escaped}%,description.ilike.%${escaped}%`,
      );
    }

    if (!sortByPrice) {
      request = request.range(
        (safePage - 1) * safePageSize,
        safePage * safePageSize - 1,
      );
    }

    const { data, count, error } = await request;
    if (error) {
      fail(`Failed to load products: ${error.message}`);
    }

    const products = (data ?? []).map(
      (row) => mapShopProduct(row as unknown as ProductRow),
    );

    if (sortByPrice) {
      products.sort(
        sort === "price-asc"
          ? (a, b) =>
              (a.price ?? Number.MAX_SAFE_INTEGER) -
              (b.price ?? Number.MAX_SAFE_INTEGER)
          : (a, b) => (b.price ?? -1) - (a.price ?? -1),
      );
      const start = (safePage - 1) * safePageSize;
      return {
        products: products.slice(start, start + safePageSize),
        total: count ?? products.length,
      };
    }

    return { products, total: count ?? products.length };
  },
);

export const getShopProducts = cache(
  async ({ category, brand, query, sort = "newest", limit = 200 }: ShopQuery = {}): Promise<ShopProduct[]> => {
    const { products } = await getShopProductsPage({
      category,
      brand,
      query,
      sort,
      page: 1,
      pageSize: limit,
    });
    return products;
  },
);

/**
 * Newest active products across an explicit set of category ids (a whole
 * department subtree, for example). Chunks the `.in()` filter so the URL
 * stays well under PostgREST limits, de-dupes across chunks and caps the
 * result.
 */
export const getProductsByCategoryIds = cache(
  async (categoryIds: string[], limit = 12): Promise<ShopProduct[]> => {
    if (categoryIds.length === 0) return [];
    const client = await catalogueClient();
    const safeLimit = Math.min(200, Math.max(1, Math.floor(limit) || 1));
    const collected: ShopProduct[] = [];
    for (let i = 0; i < categoryIds.length && collected.length < safeLimit; i += 50) {
      const chunk = categoryIds.slice(i, i + 50);
      const { data, error } = await client
        .from("products")
        .select(PRODUCT_SELECT)
        .eq("status", "active")
        .in("category_id", chunk)
        .order("created_at", { ascending: false })
        .limit(safeLimit);
      if (error) {
        fail(`Failed to load products: ${error.message}`);
      }
      collected.push(
        ...(data ?? []).map((row) => mapShopProduct(row as unknown as ProductRow)),
      );
    }
    const seen = new Set<string>();
    const products: ShopProduct[] = [];
    for (const product of collected) {
      if (seen.has(product.id)) continue;
      seen.add(product.id);
      products.push(product);
      if (products.length >= safeLimit) break;
    }
    return products;
  },
);

/**
 * Total number of active products — used for true homepage counts.
 */
export const getActiveProductCount = cache(async (): Promise<number> => {
  const client = await catalogueClient();
  const { count, error } = await client
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  if (error) {
    fail(`Failed to load product count: ${error.message}`);
  }
  return count ?? 0;
});

export const getFeaturedProducts = cache(
  async (limit = 4): Promise<ShopProduct[]> => {
    return getShopProducts({ limit });
  },
);

/**
 * Newest active products, excluding already-shown ids so the homepage
 * "New arrivals" rail never duplicates the featured section.
 */
export const getNewArrivals = cache(
  async (limit = 8, excludeIds: string[] = []): Promise<ShopProduct[]> => {
    const products = await getShopProducts({ limit: 200 });
    const excluded = new Set(excludeIds);
    return products.filter((product) => !excluded.has(product.id)).slice(0, limit);
  },
);

/**
 * Active products that currently have a sale price. Used as the featured
 * section when the store has sale items; falls back to newest products
 * otherwise.
 */
export const getSaleProducts = cache(
  async (limit = 8): Promise<ShopProduct[]> => {
    const products = await getShopProducts({ limit: 200 });
    return products.filter((product) => product.hasSale).slice(0, limit);
  },
);

export type BestSellerItem = {
  productId: string;
  productSlug: string;
  productName: string;
  categoryName: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  price: number | null;
  salePrice: number | null;
  hasSale: boolean;
  unitsSold: number;
};

/**
 * The most-ordered products on the store, ranked by real customer order
 * quantities. Cancelled orders are excluded. Returns an empty list when
 * the store has no orders yet — nothing is simulated.
 */
export const getBestSellers = cache(
  async (limit = 8): Promise<BestSellerItem[]> => {
    const client = await catalogueClient();

    const [ordersResult, itemsResult] = await Promise.all([
      client.from("orders").select("id").neq("status", "cancelled").limit(500),
      client.from("order_items").select("order_id, variant_id, quantity").limit(1000),
    ]);
    if (ordersResult.error) {
      fail(`Failed to load best sellers: ${ordersResult.error.message}`);
    }
    if (itemsResult.error) {
      fail(`Failed to load best sellers: ${itemsResult.error.message}`);
    }

    const orderIds = new Set((ordersResult.data ?? []).map((row) => row.id));
    const counts = new Map<string, number>();
    for (const row of itemsResult.data ?? []) {
      if (!row.variant_id || !orderIds.has(row.order_id)) continue;
      const quantity = Number(row.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      counts.set(row.variant_id, (counts.get(row.variant_id) ?? 0) + quantity);
    }

    const ranked = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);
    if (ranked.length === 0) return [];

    const variantIds = ranked.map(([id]) => id);
    const lines = await getCartProductLines(variantIds);
    const byVariant = new Map(lines.map((line) => [line.variantId, line]));

    const productIds = [...new Set(lines.map((line) => line.productId))];
    const categoryResult = await client
      .from("products")
      .select("id, category:categories(name)")
      .in("id", productIds);
    if (categoryResult.error) {
      fail(
        `Failed to load best sellers: ${categoryResult.error.message}`,
      );
    }
    const categoryByProduct = new Map(
      (categoryResult.data ?? []).map((row) => [
        row.id,
        (
          row.category as unknown as { name: string } | null
        )?.name ?? null,
      ]),
    );

    return ranked.flatMap(([variantId, unitsSold]) => {
      const line = byVariant.get(variantId);
      if (!line) return [];
      return [
        {
          productId: line.productId,
          productSlug: line.productSlug,
          productName: line.productName,
          categoryName: categoryByProduct.get(line.productId) ?? null,
          imageUrl: line.imageUrl,
          imageAlt: line.imageAlt,
          price: line.price,
          salePrice: line.salePrice,
          hasSale: line.hasSale,
          unitsSold: Math.round(unitsSold),
        },
      ];
    });
  },
);

export const getProductBySlug = cache(
  async (slug: string): Promise<ProductDetail | null> => {
    const client = await catalogueClient();
    const { data, error } = await client
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("slug", slug)
      .eq("status", "active")
      .maybeSingle();
    if (error) {
      fail(`Failed to load product: ${error.message}`);
    }
    if (!data) return null;

    const row = data as unknown as ProductRow;
    const productImages = sortImages(
      row.product_images.filter((image) => image.variant_id === null),
    );
    const galleryImages =
      productImages.length > 0 ? productImages : sortImages(row.product_images);

    const variants: ProductVariantDetail[] = row.product_variants.map(
      (variant) => {
        const effective = effectivePricing(
          pricingFor(variant.prices, variant.id),
        );
        return {
          id: variant.id,
          name: variant.name,
          sku: variant.sku,
          options: variant.options
            ? Object.entries(variant.options).map(([key, value]) => ({
                key,
                value,
              }))
            : [],
          images: sortImages(
            row.product_images.filter((image) => image.variant_id === variant.id),
          ).map((image) => ({ url: image.url, altText: image.alt_text })),
          price: effective.price,
          salePrice: effective.salePrice,
          hasSale: effective.hasSale,
        };
      },
    );

    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      categoryId: row.category_id,
      category: row.category,
      brand: row.brand,
      productImages: galleryImages.map((image) => ({
        url: image.url,
        altText: image.alt_text,
      })),
      variants,
      available: variants.length > 0,
    };
  },
);

export const getRelatedProducts = cache(
  async (
    product: { id: string; categoryId: string | null },
    limit = 4,
  ): Promise<ShopProduct[]> => {
    if (!product.categoryId) return [];
    const client = await catalogueClient();
    const { data, error } = await client
      .from("products")
      .select(PRODUCT_SELECT)
      .eq("status", "active")
      .eq("category_id", product.categoryId)
      .neq("id", product.id)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) {
      fail(`Failed to load related products: ${error.message}`);
    }
    return (data ?? []).map(
      (row) => mapShopProduct(row as unknown as ProductRow),
    );
  },
);

export const getCartProductLines = cache(
  async (variantIds: string[]): Promise<CartProductLine[]> => {
    if (variantIds.length === 0) return [];
    const client = await catalogueClient();
    const { data, error } = await client
      .from("product_variants")
      .select(
        `
        id, name, sku, options,
        product:products(id, name, slug, product_images(url, alt_text, is_primary, sort_order)),
        prices(price_type, amount, variant_id)
      `,
      )
      .in("id", variantIds);
    if (error) {
      fail(`Failed to load cart items: ${error.message}`);
    }

    return (data ?? []).map((raw) => {
      const row = raw as unknown as {
        id: string;
        name: string;
        sku: string;
        options: Record<string, string> | null;
        product: {
          id: string;
          name: string;
          slug: string;
          product_images: ImageRow[];
        } | null;
        prices: PriceRow[];
      };
      const effective = effectivePricing(pricingFor(row.prices, row.id));
      const { url, altText } = primaryImage(row.product?.product_images ?? []);
      return {
        variantId: row.id,
        sku: row.sku,
        variantName: row.name,
        optionLabels: row.options
          ? Object.entries(row.options).map(([key, value]) => ({ key, value }))
          : [],
        productId: row.product?.id ?? "",
        productName: row.product?.name ?? "Unavailable product",
        productSlug: row.product?.slug ?? "",
        imageUrl: url,
        imageAlt: altText,
        price: effective.price,
        salePrice: effective.salePrice,
        hasSale: effective.hasSale,
        available: Boolean(row.product),
      };
    });
  },
);
export type DeliveryMethod = {
  id: string;
  code: string;
  name: string;
  kind: "delivery" | "pickup";
  /** Legacy flat fee (no longer used for quotes; rates govern fees). */
  fee: number | null;
};

export const getDeliveryMethods = cache(
  async (): Promise<DeliveryMethod[]> => {
    const client = await catalogueClient();
    const { data, error } = await client
      .from("delivery_methods")
      .select("id, code, name, kind, fee")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (error) {
      fail(`Failed to load delivery methods: ${error.message}`);
    }
    return (data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      kind: row.kind === "pickup" ? "pickup" : "delivery",
      fee: row.fee === null || row.fee === undefined ? null : Number(row.fee),
    }));
  },
);

export type DeliveryRate = {
  deliveryMethodId: string;
  regionId: string;
  fee: number;
  etaMinDays: number;
  etaMaxDays: number;
  isActive: boolean;
};

export const getDeliveryRates = cache(
  async (): Promise<DeliveryRate[]> => {
    const client = await catalogueClient();
    const { data, error } = await client
      .from("delivery_rates")
      .select(
        "delivery_method_id, region_id, fee, eta_min_days, eta_max_days, is_active",
      );
    if (error) {
      fail(`Failed to load delivery rates: ${error.message}`);
    }
    return (data ?? []).map((row) => ({
      deliveryMethodId: row.delivery_method_id,
      regionId: row.region_id,
      fee: Number(row.fee),
      etaMinDays: Number(row.eta_min_days),
      etaMaxDays: Number(row.eta_max_days),
      isActive: row.is_active,
    }));
  },
);

export type StoreLocation = {
  id: string;
  code: string;
  name: string;
  regionName: string | null;
  city: string;
  addressLine1: string;
  addressLine2: string | null;
  phone: string | null;
};

export const getActiveLocations = cache(
  async (): Promise<StoreLocation[]> => {
    const client = await catalogueClient();
    const { data, error } = await client
      .from("locations")
      .select("id, code, name, city, address_line_1, address_line_2, phone, regions(name)")
      .eq("status", "active")
      .order("name", { ascending: true });
    if (error) {
      fail(`Failed to load store locations: ${error.message}`);
    }
    const rows = (data ?? []) as unknown as {
      id: string;
      code: string;
      name: string;
      city: string;
      address_line_1: string;
      address_line_2: string | null;
      phone: string | null;
      regions: { name: string } | null;
    }[];
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      regionName: row.regions?.name ?? null,
      city: row.city,
      addressLine1: row.address_line_1,
      addressLine2: row.address_line_2,
      phone: row.phone,
    }));
  },
);

export type Region = {
  id: string;
  name: string;
};

export const getRegions = cache(async (): Promise<Region[]> => {
  const client = await catalogueClient();
  const { data, error } = await client
    .from("regions")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) {
    fail(`Failed to load regions: ${error.message}`);
  }
  return (data ?? []).map((row) => ({ id: row.id, name: row.name }));
});

export type City = {
  id: string;
  regionId: string;
  name: string;
};

export const getCities = cache(async (): Promise<City[]> => {
  const client = await catalogueClient();
  const { data, error } = await client
    .from("cities")
    .select("id, region_id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  if (error) {
    fail(`Failed to load cities: ${error.message}`);
  }
  return (data ?? []).map((row) => ({
    id: row.id,
    regionId: row.region_id,
    name: row.name,
  }));
});
