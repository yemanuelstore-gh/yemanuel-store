import Link from "next/link";
import { ButtonLink } from "@/components/storefront/button-link";
import { ProductImage } from "@/components/storefront/product-image";
import { formatGHS } from "@/lib/format";
import type { ShopProduct } from "@/lib/catalogue";

type SpotlightProps = {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  ctaLabel: string;
  visual: { imageUrl: string | null; alt: string | null } | null;
  monogram: string;
  products: ShopProduct[];
  reverse?: boolean;
};

function SpotlightProduct({ product }: { product: ShopProduct }) {
  const mainPrice =
    product.hasSale && product.salePrice !== null ? product.salePrice : product.price;

  return (
    <Link
      href={`/shop/${product.slug}`}
      className="group flex items-center gap-2.5 rounded-lg border border-line bg-paper p-2.5 shadow-soft transition-all duration-300 hover:border-gold/60 hover:shadow-lifted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
    >
      <div className="relative h-14 w-12 flex-shrink-0 overflow-hidden rounded-md border border-line bg-navy-soft transition-colors duration-300 group-hover:border-gold/60">
        <ProductImage
          src={product.imageUrl}
          alt={product.imageAlt ?? product.name}
          sizes="48px"
          fallbackLetter={product.name.charAt(0)}
        />
        {product.hasSale && (
          <span className="absolute left-1 top-1 rounded-sm bg-gold px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-navy-dark">
            Sale
          </span>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="line-clamp-1 text-[13px] font-medium text-ink transition-colors group-hover:text-navy">
          {product.name}
        </h3>
        <p className="mt-0.5 text-[11px] text-ink-faint">
          {product.categoryName ?? "Yemanuel Store"}
        </p>
        <p className="mt-0.5 text-[13px] font-semibold text-ink">
          {mainPrice !== null ? formatGHS(mainPrice) : "Price on request"}
        </p>
      </div>
      <span aria-hidden="true" className="ml-auto text-gold-dark opacity-0 transition-opacity group-hover:opacity-100">
        →
      </span>
    </Link>
  );
}

export function Spotlight({
  eyebrow,
  title,
  description,
  href,
  ctaLabel,
  visual,
  monogram,
  products,
  reverse = false,
}: SpotlightProps) {
  return (
    <section className="border-t border-line bg-ivory">
      <div className="mx-auto max-w-6xl px-4 py-9 lg:py-12">
        <div
          className={
            reverse
              ? "grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]"
              : "grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]"
          }
        >
          <div
            className={
              reverse
                ? "lg:order-2"
                : "lg:order-1"
            }
          >
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-gold-dark">
              <span aria-hidden="true" className="h-px w-8 bg-gold" />
              {eyebrow}
            </p>
            <h2 className="mt-2 text-balance font-display text-2xl font-medium tracking-tight text-ink lg:text-3xl">
              {title}
            </h2>
            <p className="mt-2 max-w-md text-[13px] leading-5 text-ink-soft">
              {description}
            </p>
            <div className="mt-4">
              <ButtonLink href={href} variant="gold">
                {ctaLabel}
                <span aria-hidden="true">→</span>
              </ButtonLink>
            </div>

            {products.length > 0 && (
              <div className="mt-4 space-y-2">
                {products.slice(0, 3).map((product) => (
                  <SpotlightProduct key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>

          <div
            className={
              reverse
                ? "lg:order-1"
                : "lg:order-2"
            }
          >
            <div className="relative">
              <span
                aria-hidden="true"
                className={
                  reverse
                    ? "absolute -right-3 -top-3 h-16 w-16 rounded-tr-lg border-r border-t border-gold/60"
                    : "absolute -left-3 -top-3 h-16 w-16 rounded-tl-lg border-l border-t border-gold/60"
                }
              />
              <div className="image-shine group relative aspect-[4/5] overflow-hidden rounded-lg border border-line bg-navy shadow-lifted transition-colors duration-300 group-hover:border-gold/50">
                {visual?.imageUrl ? (
                  <ProductImage
                    src={visual.imageUrl}
                    alt={visual.alt ?? title}
                    sizes="(min-width: 1024px) 45vw, 100vw"
                    className="h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-navy">
                    <div
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0"
                      style={{
                        background:
                          "radial-gradient(420px 280px at 50% 20%, rgb(201 162 39 / 0.18), transparent 65%)",
                      }}
                    />
                    <span className="font-display text-[10rem] font-medium italic text-ivory/10">
                      {monogram}
                    </span>
                    <span className="absolute bottom-6 text-[11px] font-medium uppercase tracking-[0.22em] text-ivory/45">
                      The {eyebrow.toLowerCase()} shelves are being stocked
                    </span>
                  </div>
                )}
                <span className="absolute left-4 top-4 rounded-sm bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-dark">
                  {eyebrow}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}