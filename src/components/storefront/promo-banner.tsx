import Image from "next/image";
import { ButtonLink } from "@/components/storefront/button-link";
import { ProductImage } from "@/components/storefront/product-image";
import { formatGHS } from "@/lib/format";
import type { ShopProduct } from "@/lib/catalogue";

export function PromoBanner({ product }: { product: ShopProduct | null }) {
  return (
    <section className="relative overflow-hidden border-y border-gold/25 bg-gold-soft/70">
      <Image
        src="/images/promo-editorial.jpg"
        alt=""
        fill
        sizes="100vw"
        className="object-cover object-center opacity-40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-gold-soft/95 via-gold-soft/85 to-gold-soft/40"
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-8 px-4 py-9 lg:grid-cols-[1fr_300px] lg:py-12">
        <div>
          <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-gold-dark">
            <span aria-hidden="true" className="h-px w-8 bg-gold-dark" />
            New season
          </p>
          <h2 className="mt-2 max-w-xl text-balance font-display text-2xl font-medium tracking-tight text-navy lg:text-3xl">
            The newest arrivals, ready for you.
          </h2>
          <p className="mt-2 max-w-lg text-[13px] leading-5 text-ink-soft">
            The catalogue grows every week — new fashion, electronics, beauty
            and home items are added as the shelves fill up.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ButtonLink href="/shop">Shop the catalogue</ButtonLink>
            <ButtonLink href="/shop" variant="secondary">
              Browse categories
            </ButtonLink>
          </div>
        </div>

        {product && (
          <div className="relative mx-auto w-full max-w-xs lg:max-w-none">
            <span
              aria-hidden="true"
              className="absolute -right-3 -top-3 h-20 w-20 rounded-tr-lg border-r border-t border-gold-dark/50"
            />
            <div className="image-shine group relative aspect-[4/5] overflow-hidden rounded-lg border border-gold/40 bg-navy-soft shadow-lifted">
              <ProductImage
                src={product.imageUrl}
                alt={product.imageAlt ?? product.name}
                sizes="(min-width: 1024px) 24vw, 50vw"
                fallbackLetter={product.name.charAt(0)}
                className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
              />
              <span className="absolute left-4 top-4 rounded-sm bg-navy px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
                New
              </span>
            </div>
            <div className="absolute -bottom-4 left-5 right-5 flex items-center justify-between gap-3 rounded-md border border-line bg-white px-4 py-2.5 shadow-card">
              <p className="line-clamp-1 text-xs font-medium text-ink">
                {product.name}
              </p>
              <p className="shrink-0 text-sm font-semibold text-gold-dark">
                {product.salePrice !== null && product.hasSale
                  ? formatGHS(product.salePrice)
                  : product.price !== null
                    ? formatGHS(product.price)
                    : "—"}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}