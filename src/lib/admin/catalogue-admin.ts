import { createClient } from "@/lib/supabase/server";

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  description: string | null;
  image_url: string | null;
  sort_order: number;
  status: string;
  parent: { name: string } | null;
  productsCount: number;
};

export async function getCategories({
  q,
  page = 1,
  pageSize = 50,
}: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ categories: CategoryRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("categories")
    .select("id, name, slug, parent_id, description, image_url, sort_order, status, parent:categories!categories_parent_id_fkey(name)", {
      count: "exact",
    });

  if (q && q.trim() !== "") {
    query = query.ilike("name", `%${q.trim()}%`);
  }

  const { data, count } = await query
    .order("sort_order", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    description: string | null;
    image_url: string | null;
    sort_order: number;
    status: string;
    parent: { name: string } | null;
  }[];

  const ids = rows.map((row) => row.id);
  const productCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: counts } = await client
      .from("products")
      .select("category_id")
      .in("category_id", ids);
    for (const row of counts ?? []) {
      productCounts.set(row.category_id, (productCounts.get(row.category_id) ?? 0) + 1);
    }
  }

  return {
    categories: rows.map((row) => ({
      ...row,
      productsCount: productCounts.get(row.id) ?? 0,
    })),
    total: count ?? 0,
  };
}

export async function getCategoryById(id: string) {
  const client = await createClient();
  const { data, error } = await client
    .from("categories")
    .select("id, name, slug, parent_id, description, image_url, sort_order, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    description: string | null;
    image_url: string | null;
    sort_order: number;
    status: string;
  };
}

export type BrandRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  productsCount: number;
};

export async function getBrands({
  q,
  page = 1,
  pageSize = 50,
}: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ brands: BrandRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("brands")
    .select("id, name, slug, description, status", { count: "exact" });

  if (q && q.trim() !== "") {
    query = query.ilike("name", `%${q.trim()}%`);
  }

  const { data, count } = await query
    .order("name", { ascending: true })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
  }[];

  const ids = rows.map((row) => row.id);
  const productCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: counts } = await client
      .from("products")
      .select("brand_id")
      .in("brand_id", ids);
    for (const row of counts ?? []) {
      if (row.brand_id) {
        productCounts.set(row.brand_id, (productCounts.get(row.brand_id) ?? 0) + 1);
      }
    }
  }

  return {
    brands: rows.map((row) => ({
      ...row,
      productsCount: productCounts.get(row.id) ?? 0,
    })),
    total: count ?? 0,
  };
}

export async function getBrandById(id: string) {
  const client = await createClient();
  const { data, error } = await client
    .from("brands")
    .select("id, name, slug, description, status")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    status: string;
  };
}

export async function getAllCategories() {
  const client = await createClient();
  const { data } = await client
    .from("categories")
    .select("id, name, parent_id")
    .order("name", { ascending: true });
  return (data ?? []) as unknown as { id: string; name: string; parent_id: string | null }[];
}