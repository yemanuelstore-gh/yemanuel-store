import Link from "next/link";
import { SectionHeader } from "@/components/storefront/section-header";
import { BrandMonogram } from "@/components/storefront/brand-monogram";
import type { BrandSummary } from "@/lib/catalogue";

/**
 * Compact top-brands strip. Shows a curated subset of the live brands
 * (those with products), with a clear path to the full brand filter on
 * the shop page. Brand lists come straight from the catalogue.
 */
export function BrandStrip({ brands }: { brands: BrandSummary[] }) {
  if (brands.length === 0) return null;

  const topBrands = brands.filter((brand) => brand.productCount > 0).slice(0, 12);
  if (topBrands.length === 0) return null;

  return (
    <section className="border-t border-line bg-ivory">
      <div className="mx-auto max-w-6xl px-4 py-7 lg:py-9">
        <SectionHeader
          eyebrow="Brands"
          title="Shop by brand"
          description="Find products from the brands we stock, all in one place."
          actionHref="/shop"
          actionLabel="All brands"
          titleSize="md"
        />

        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
          {topBrands.map((brand) => (
            <Link
              key={brand.id}
              href={`/brands/${brand.slug}`}
              className="group rounded-lg border border-line bg-paper p-2.5 text-center shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
            >
              <BrandMonogram name={brand.name} className="mx-auto h-9 w-9 text-base" />
              <p className="mt-2 truncate font-display text-xs font-semibold tracking-tight text-ink transition-colors group-hover:text-navy">
                {brand.name}
              </p>
              <p className="mt-0.5 text-[10px] font-medium text-ink-faint">
                {brand.productCount}{" "}
                {brand.productCount === 1 ? "item" : "items"}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
