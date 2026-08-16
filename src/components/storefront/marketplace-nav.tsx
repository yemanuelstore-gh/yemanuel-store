import Link from "next/link";
import type { CategorySummary } from "@/lib/catalogue";

/**
 * The category slugs the marketplace navigation prioritises, in order.
 * Every link is resolved against the live category tree — slugs that do
 * not exist are simply skipped, so nothing fake is ever rendered.
 */
const PRIORITY_SLUGS = [
  "fashion",
  "electronics",
  "cosmetics-beauty",
  "home-living-appliances",
  "mobile-phones",
  "computers",
  "audio",
  "gaming",
  "beauty",
  "home-appliances",
  "footwear",
  "fashion-accessories",
];

/**
 * Compact marketplace category navigation rendered directly beneath the
 * store header on every storefront page. Reads the real category tree, so
 * product counts are never fabricated. Scrolls horizontally on mobile.
 */
export function MarketplaceNav({
  categories,
}: {
  categories: CategorySummary[];
}) {
  const bySlug = new Map(categories.map((category) => [category.slug, category]));
  const items = PRIORITY_SLUGS.map((slug) => bySlug.get(slug)).filter(
    (category): category is CategorySummary => Boolean(category),
  );
  if (items.length === 0) return null;

  return (
    <div className="border-b border-line bg-paper shadow-soft">
      <nav
        aria-label="Categories"
        className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((category) => (
          <Link
            key={category.id}
            href={`/categories/${category.slug}`}
            className="shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-gold-soft hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
          >
            {category.name}
          </Link>
        ))}
        <Link
          href="/shop"
          className="ml-auto shrink-0 whitespace-nowrap rounded-full bg-navy px-3 py-1 text-xs font-semibold text-ivory transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          All categories
        </Link>
      </nav>
    </div>
  );
}
