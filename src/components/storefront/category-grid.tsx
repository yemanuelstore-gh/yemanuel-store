import Link from "next/link";
import { ProductImage } from "@/components/storefront/product-image";
import { SectionHeader } from "@/components/storefront/section-header";
import type { CategorySummary } from "@/lib/catalogue";

const DEPARTMENT_SLUGS = [
  "fashion",
  "electronics",
  "cosmetics-beauty",
  "home-living-appliances",
];

/**
 * Dense "Shop by category" tile grid. Leads with the four official
 * departments, then tops up with the commercially useful leaf categories
 * that actually carry products. Product counts come from the live
 * category tree — nothing is hardcoded or fabricated.
 */
export function CategoryGrid({ categories }: { categories: CategorySummary[] }) {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const departments = DEPARTMENT_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (category): category is CategorySummary => Boolean(category),
  );
  const leafCategories = categories
    .filter(
      (category) =>
        category.parentId !== null &&
        category.productCount > 0 &&
        !DEPARTMENT_SLUGS.includes(category.slug),
    )
    .sort((a, b) => b.productCount - a.productCount)
    .slice(0, 8);

  const tiles = [...departments, ...leafCategories].slice(0, 12);
  if (tiles.length === 0) return null;

  return (
    <section className="border-t border-line bg-paper">
      <div className="mx-auto max-w-6xl px-4 py-7 lg:py-9">
        <SectionHeader
          eyebrow="Categories"
          title="Shop by category"
          description="Fashion, electronics, beauty and home — every department, organised for the way Ghana shops."
          actionHref="/shop"
          actionLabel="All categories"
          titleSize="md"
        />

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {tiles.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="group rounded-lg border border-line bg-ivory/40 p-2.5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <div className="image-shine relative aspect-square overflow-hidden rounded-md border border-line bg-navy-soft transition-colors duration-300 group-hover:border-gold/60">
                <ProductImage
                  src={category.imageUrl}
                  alt={category.name}
                  sizes="(min-width: 1024px) 180px, (min-width: 640px) 140px, 100px"
                  fallbackLetter={category.name.charAt(0)}
                  fallbackLabel="Shop"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                />
              </div>
              <h3 className="mt-2 line-clamp-1 text-[11px] font-semibold leading-4 text-ink transition-colors group-hover:text-navy">
                {category.name}
              </h3>
              <p className="mt-0.5 text-[10px] font-medium text-ink-faint">
                {category.productCount}{" "}
                {category.productCount === 1 ? "item" : "items"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
