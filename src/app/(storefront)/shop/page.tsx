import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductCard } from "@/components/storefront/product-card";
import { EmptyCatalogueState } from "@/components/storefront/empty-state";
import { Pagination } from "@/components/storefront/pagination";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { SortSelect } from "@/components/storefront/sort-select";
import {
  getBrands,
  getCategories,
  getShopProductsPage,
  type ShopSort,
} from "@/lib/catalogue";
import { buildDepartments } from "@/lib/storefront-departments";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Shop",
  description:
    "Browse the Yemanuel Store catalogue — fashion, electronics, beauty and home in Ghana, priced in GHS.",
};

const PAGE_SIZE = 48;

const filterPill = (active: boolean) =>
  cn(
    "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy",
    active
      ? "border-navy bg-navy text-white"
      : "border-line-strong bg-white text-ink-soft hover:border-navy/50 hover:bg-navy-soft/50",
  );

function shopHref(params: {
  q?: string | null;
  category?: string | null;
  brand?: string | null;
  sort?: string | null;
  page?: string | null;
}): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.brand) search.set("brand", params.brand);
  if (params.sort && params.sort !== "newest") search.set("sort", params.sort);
  if (params.page) search.set("page", params.page);
  const query = search.toString();
  return query ? `/shop?${query}` : "/shop";
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    brand?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const { q, category, brand, sort, page } = await searchParams;
  const query = q?.trim();
  const activeSort: ShopSort =
    sort === "price-asc" || sort === "price-desc" || sort === "name"
      ? sort
      : "newest";
  const activePage = Math.max(1, Number(page) || 1);

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let brands: Awaited<ReturnType<typeof getBrands>> = [];
  let products: Awaited<ReturnType<typeof getShopProductsPage>>["products"] = [];
  let total = 0;
  let failed = false;

  try {
    const [categoriesResult, brandsResult, productsResult] = await Promise.allSettled([
      getCategories(),
      getBrands(),
      getShopProductsPage({
        category,
        brand,
        query,
        sort: activeSort,
        page: activePage,
        pageSize: PAGE_SIZE,
      }),
    ]);

    if (categoriesResult.status === "rejected") {
      failed = true;
    } else {
      categories = categoriesResult.value;
    }

    if (brandsResult.status === "rejected") {
      failed = true;
    } else {
      brands = brandsResult.value;
    }

    if (productsResult.status === "rejected") {
      failed = true;
    } else {
      products = productsResult.value.products;
      total = productsResult.value.total;
    }
  } catch {
    failed = true;
  }

  const activeCategory = categories.find((item) => item.slug === category);
  const activeBrand = brands.find((item) => item.slug === brand);

  const departments = buildDepartments(categories);

  const emptyTitle = query
    ? "No products found"
    : activeCategory
      ? `Nothing in ${activeCategory.name} yet`
      : activeBrand
        ? `Nothing from ${activeBrand.name} yet`
        : "The catalogue is being prepared";

  const emptyDescription = query
    ? `No results for “${query}” — check the spelling or try a different keyword.`
    : activeCategory
      ? `The ${activeCategory.name} shelf is being stocked. Check back soon.`
      : activeBrand
        ? `The ${activeBrand.name} shelf is being stocked. Check back soon.`
        : "Fashion, electronics, beauty and home are being curated for the store. Check back soon as the shelves fill up.";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 lg:py-16">
      <section className="relative overflow-hidden rounded-lg border border-line bg-navy">
        <Image
          src="/images/retail-editorial.jpg"
          alt=""
          fill
          sizes="(min-width: 1152px) 1104px, 100vw"
          className="object-cover object-right opacity-45"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/30"
        />
        <div className="relative px-6 py-9 sm:px-8 lg:px-10 lg:py-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">
            Yemanuel Store
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ivory lg:text-4xl">
            Shop
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-ivory/75">
            Fashion, electronics, beauty and home for Ghana — prices in GHS.
          </p>
        </div>
      </section>

      {departments.length > 0 && (
        <nav
          aria-label="Departments"
          className="mt-6 flex flex-wrap items-center gap-2"
        >
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Departments
          </span>
          {departments.map((department) => (
            <Link
              key={department.id}
              href={
                department.category
                  ? `/categories/${department.category.slug}`
                  : "/shop"
              }
              className="rounded-full border border-line-strong bg-paper px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-gold/60 hover:bg-gold-soft hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              {department.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <form
          action="/shop"
          method="get"
          className="flex w-full max-w-sm gap-2"
        >
          <label htmlFor="shop-search" className="sr-only">
            Search the catalogue
          </label>
          <Input
            id="shop-search"
            name="q"
            type="search"
            placeholder="Search the catalogue"
            defaultValue={query}
          />
          <Button type="submit">Search</Button>
        </form>

        <SortSelect value={activeSort} />
      </div>

      <nav
        aria-label="Categories"
        className="mt-4 flex flex-wrap items-center gap-2"
      >
        <Link
          href={shopHref({ q: query, brand })}
          className={filterPill(!activeCategory && !brand)}
        >
          All
        </Link>
        {categories.map((item) => (
          <Link
            key={item.id}
            href={shopHref({ q: query, category: item.slug, brand })}
            className={filterPill(activeCategory?.id === item.id)}
          >
            {item.name}
          </Link>
        ))}
      </nav>

      {brands.length > 0 && (
        <nav
          aria-label="Brands"
          className="mt-3 flex flex-wrap items-center gap-2"
        >
          <Link
            href={shopHref({ q: query, category })}
            className={filterPill(!activeBrand && !brand)}
          >
            All brands
          </Link>
          {brands.map((item) => (
            <Link
              key={item.id}
              href={shopHref({ q: query, category, brand: item.slug })}
              className={filterPill(activeBrand?.id === item.id)}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      )}

      <p aria-live="polite" className="mt-8 text-sm text-ink-soft">
        {failed
          ? "Catalogue could not be loaded."
          : `${total} ${total === 1 ? "product" : "products"}${
              activeCategory ? ` in ${activeCategory.name}` : ""
            }${activeBrand ? ` from ${activeBrand.name}` : ""}${
              query ? ` matching “${query}”` : ""
            }`}
      </p>

      {failed ? (
        <RetryPanel
          className="mt-6"
          retryHref={shopHref({ q: query, category, brand, sort, page })}
        />
      ) : products.length > 0 ? (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      ) : (
        <EmptyCatalogueState
          className="mt-6"
          title={emptyTitle}
          description={emptyDescription}
        />
      )}

      {!failed && (
        <Pagination
          page={activePage}
          pageSize={PAGE_SIZE}
          total={total}
          basePath="/shop"
          searchParams={await searchParams}
        />
      )}
    </div>
  );
}