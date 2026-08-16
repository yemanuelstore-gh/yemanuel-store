import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { CatalogueBrowser } from "@/components/storefront/catalogue-browser";
import { BrandMonogram } from "@/components/storefront/brand-monogram";
import { RetryPanel } from "@/components/storefront/retry-panel";
import {
  getBrandBySlug,
  getShopProductsPage,
  type ShopSort,
} from "@/lib/catalogue";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) {
    return { title: "Brand not found" };
  }
  return {
    title: `${brand.name} — Yemanuel Store`,
    description:
      brand.description ??
      `Browse ${brand.name} products at Yemanuel Store in Ghana, priced in GHS.`,
  };
}

const PAGE_SIZE = 48;

export default async function BrandPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const { q, sort, page } = await searchParams;
  const query = q?.trim() ?? null;
  const activeSort: ShopSort =
    sort === "price-asc" || sort === "price-desc" || sort === "name"
      ? sort
      : "newest";
  const activePage = Math.max(1, Number(page) || 1);

  let products: Awaited<ReturnType<typeof getShopProductsPage>>["products"] = [];
  let total = 0;
  let failed = false;
  try {
    const result = await getShopProductsPage({
      brand: brand.slug,
      query: query ?? undefined,
      sort: activeSort,
      page: activePage,
      pageSize: PAGE_SIZE,
    });
    products = result.products;
    total = result.total;
  } catch {
    failed = true;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Shop", href: "/shop" },
          { label: brand.name },
        ]}
      />

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-navy-soft">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_200px] md:items-center lg:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">
              Brand
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink lg:text-4xl">
              {brand.name}
            </h1>
            {brand.description && (
              <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">
                {brand.description}
              </p>
            )}
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-3 py-1 text-xs font-medium text-navy">
              {brand.productCount} {brand.productCount === 1 ? "product" : "products"}
            </p>
          </div>
          <div className="hidden items-center justify-center md:flex">
            <BrandMonogram name={brand.name} className="h-24 w-24 text-4xl" />
          </div>
        </div>
      </section>

      <div className="mt-10">
        {failed ? (
          <RetryPanel retryHref={`/brands/${brand.slug}`} />
        ) : (
          <CatalogueBrowser
            products={products}
            total={total}
            page={activePage}
            pageSize={PAGE_SIZE}
            sort={activeSort}
            query={query}
            basePath={`/brands/${brand.slug}`}
            searchParams={await searchParams}
            emptyTitle={`Nothing from ${brand.name} yet`}
            emptyDescription={`The ${brand.name} shelf is being stocked. Check back soon.`}
          />
        )}
      </div>
    </div>
  );
}