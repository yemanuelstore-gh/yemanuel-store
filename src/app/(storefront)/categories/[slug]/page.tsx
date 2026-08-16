import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { CatalogueBrowser } from "@/components/storefront/catalogue-browser";
import { ProductImage } from "@/components/storefront/product-image";
import { RetryPanel } from "@/components/storefront/retry-panel";
import { resolveCategoryCover } from "@/lib/storefront-departments";
import {
  getCategories,
  getCategoryBySlug,
  getShopProductsPage,
  type ShopSort,
} from "@/lib/catalogue";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) {
    return { title: "Category not found" };
  }
  return {
    title: `${category.name} — Yemanuel Store`,
    description:
      category.description ??
      `Browse ${category.name} at Yemanuel Store in Ghana, priced in GHS.`,
  };
}

const PAGE_SIZE = 48;

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const categories = await getCategories().catch(() => []);
  const parent = category.parentId
    ? categories.find((item) => item.id === category.parentId) ?? null
    : null;
  const children = categories.filter((item) => item.parentId === category.id);

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
      category: category.slug,
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
          ...(parent
            ? [{ label: parent.name, href: `/categories/${parent.slug}` }]
            : []),
          { label: category.name },
        ]}
      />

      <section className="mt-6 overflow-hidden rounded-lg border border-line bg-navy-soft">
        <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[1fr_280px] md:items-center lg:p-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">
              Categories
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink lg:text-4xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-3 max-w-xl text-sm leading-6 text-ink-soft">
                {category.description}
              </p>
            )}
            <p className="mt-4 inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-3 py-1 text-xs font-medium text-navy">
              {category.productCount}{" "}
              {category.productCount === 1 ? "product" : "products"}
            </p>
          </div>
          <div className="aspect-[4/3] overflow-hidden rounded-md border border-line md:aspect-square">
            <ProductImage
              src={category.imageUrl ?? resolveCategoryCover(category.slug, categories)}
              alt={category.name}
              sizes="(min-width: 768px) 280px, 100vw"
              fallbackLetter={category.name.charAt(0)}
              fallbackLabel="Category"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {children.length > 0 && (
        <nav
          aria-label={`Subcategories of ${category.name}`}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Browse
          </span>
          {children.map((child) => (
            <Link
              key={child.id}
              href={`/categories/${child.slug}`}
              className="rounded-full border border-line-strong bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-gold/60 hover:bg-gold-soft hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              {child.name}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-10">
        {failed ? (
          <RetryPanel
            retryHref={`/categories/${category.slug}`}
          />
        ) : (
          <CatalogueBrowser
            products={products}
            total={total}
            page={activePage}
            pageSize={PAGE_SIZE}
            sort={activeSort}
            query={query}
            basePath={`/categories/${category.slug}`}
            searchParams={await searchParams}
            emptyTitle={`Nothing in ${category.name} yet`}
            emptyDescription={`The ${category.name} shelf is being stocked. Check back soon.`}
          />
        )}
      </div>
    </div>
  );
}