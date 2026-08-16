import Link from "next/link";
import Image from "next/image";
import { ButtonLink } from "@/components/storefront/button-link";
import { ProductImage } from "@/components/storefront/product-image";
import { formatGHS } from "@/lib/format";
import type { CategorySummary, ShopProduct } from "@/lib/catalogue";

export function Hero({
  product,
  categories,
}: {
  product: ShopProduct | null;
  categories: CategorySummary[];
}) {
  return (
    <section className="relative overflow-hidden bg-navy">
      <Image
        src="/images/hero-editorial.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-60"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/35"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(720px 420px at 85% 10%, rgb(201 162 39 / 0.16), transparent 65%), radial-gradient(560px 380px at 8% 100%, rgb(201 162 39 / 0.08), transparent 60%)",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(248 246 241 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(248 246 241 / 0.04) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-8 pt-10 lg:pb-10 lg:pt-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
              Fashion · Electronics · Beauty · Home
            </span>
            <h1 className="mt-4 text-balance font-display text-3xl font-medium leading-[1.08] tracking-tight text-ivory sm:text-4xl lg:text-5xl">
              Shop fashion, electronics, beauty and home,{" "}
              <em className="italic text-gold">delivered across Ghana.</em>
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ivory/70">
              Yemanuel Store brings quality fashion, electronics, beauty and
              home essentials to Ghanaian shoppers — priced in GHS, with
              delivery built for Ghana.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ButtonLink href="/shop" variant="gold">
                Shop Now
              </ButtonLink>
              <ButtonLink href="/shop" variant="outline-light">
                Explore Categories
              </ButtonLink>
            </div>
            <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-ivory/60">
              {["Prices in GHS", "Secure checkout", "Ghana-wide delivery"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span aria-hidden="true" className="h-1 w-1 rounded-full bg-gold" />
                    {item}
                  </li>
                ),
              )}
            </ul>
          </div>

          {product ? (
            <div className="hidden lg:block">
              <Link
                href={`/shop/${product.slug}`}
                className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                <div className="relative mx-auto max-w-sm">
                  <span
                    aria-hidden="true"
                    className="absolute -left-3 -top-3 h-24 w-24 rounded-tl-lg border-l border-t border-gold/50"
                  />
                  <div className="image-shine relative aspect-[4/5] overflow-hidden rounded-lg border border-ivory/15 shadow-lifted transition-colors duration-300 group-hover:border-gold/50">
                    <ProductImage
                      src={product.imageUrl}
                      alt={product.imageAlt ?? product.name}
                      sizes="(min-width: 1024px) 28vw, 0px"
                      priority
                      fallbackLetter={product.name.charAt(0)}
                      className="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <span className="absolute left-4 top-4 rounded-sm bg-gold px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-navy-dark">
                      Featured
                    </span>
                  </div>
                  <div className="absolute -bottom-5 left-6 right-6 rounded-md border border-ivory/15 bg-navy-dark/95 px-4 py-3 shadow-lifted backdrop-blur">
                    <p className="line-clamp-1 text-sm font-medium text-ivory">
                      {product.name}
                    </p>
                    <div className="mt-1 flex items-baseline justify-between gap-3">
                      <p className="text-sm font-semibold text-gold">
                        {product.salePrice !== null && product.hasSale
                          ? formatGHS(product.salePrice)
                          : product.price !== null
                            ? formatGHS(product.price)
                            : "Price on request"}
                      </p>
                      <span className="text-xs font-medium text-ivory/60 transition-colors group-hover:text-gold">
                        View product →
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          ) : (
            <div className="hidden lg:block">
              <div className="relative mx-auto flex aspect-[4/5] max-w-sm items-center justify-center rounded-lg border border-ivory/15 bg-navy-dark shadow-lifted">
                <span
                  aria-hidden="true"
                  className="font-display text-[9rem] font-medium italic text-ivory/10"
                >
                  Y
                </span>
                <span className="absolute bottom-6 text-[11px] font-medium uppercase tracking-[0.22em] text-ivory/40">
                  The shelves are being stocked
                </span>
              </div>
            </div>
          )}
        </div>

        {categories.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-ivory/10 pt-4">
            <span className="mr-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-ivory/50">
              Departments
            </span>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="rounded-full border border-ivory/20 px-3 py-1 text-[11px] font-medium text-ivory/80 transition-colors hover:border-gold/60 hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                {category.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}