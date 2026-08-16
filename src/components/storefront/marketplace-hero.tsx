import Link from "next/link";
import Image from "next/image";
import { ButtonLink } from "@/components/storefront/button-link";
import { ProductImage } from "@/components/storefront/product-image";
import { formatGHS } from "@/lib/format";
import type { ShopProduct } from "@/lib/catalogue";

function discountPercent(product: ShopProduct): number | null {
  if (
    !product.hasSale ||
    product.salePrice === null ||
    product.price === null ||
    product.price <= 0
  ) {
    return null;
  }
  return Math.round((1 - product.salePrice / product.price) * 100);
}

function SidePanel({
  eyebrow,
  product,
  href,
  accent = false,
}: {
  eyebrow: string;
  product: ShopProduct | null;
  href: string;
  accent?: boolean;
}) {
  if (!product) return null;
  const mainPrice =
    product.hasSale && product.salePrice !== null ? product.salePrice : product.price;
  const originalPrice =
    product.hasSale && product.salePrice !== null ? product.price : null;
  const discount = discountPercent(product);

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-lg border border-ivory/10 bg-navy-dark/70 p-3 backdrop-blur-sm transition-colors duration-200 hover:border-gold/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
    >
      <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded-md border border-ivory/15 bg-navy-soft transition-colors duration-300 group-hover:border-gold/50">
        <ProductImage
          src={product.imageUrl}
          alt={product.imageAlt ?? product.name}
          sizes="56px"
          fallbackLetter={product.name.charAt(0)}
          className="h-full w-full object-cover"
        />
        {discount !== null && (
          <span className="absolute left-1 top-1 rounded-sm bg-gold px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-navy-dark">
            −{discount}%
          </span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-gold">
          {eyebrow}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs font-medium text-ivory transition-colors group-hover:text-gold">
          {product.name}
        </p>
        <p className="mt-0.5 text-xs font-semibold text-gold">
          {mainPrice !== null ? formatGHS(mainPrice) : "Price on request"}
          {originalPrice !== null && (
            <span className="ml-1.5 text-[10px] font-medium text-ivory/50 line-through">
              {formatGHS(originalPrice)}
            </span>
          )}
        </p>
      </div>
      {accent && (
        <span aria-hidden="true" className="ml-auto text-gold/70">
          →
        </span>
      )}
    </Link>
  );
}

/**
 * Dense marketplace hero: a main promotional panel with real catalogue
 * stats, plus two compact promotional cards fed by actual products
 * (flash sale and new arrivals). No fabricated numbers, no dead space.
 */
export function MarketplaceHero({
  heroProduct,
  sale,
  newArrivals,
  productCount,
  brandCount,
  categoryCount,
}: {
  heroProduct: ShopProduct | null;
  sale: ShopProduct[];
  newArrivals: ShopProduct[];
  productCount: number;
  brandCount: number;
  categoryCount: number;
}) {
  const stats = [
    { value: `${productCount.toLocaleString()}`, label: "products" },
    { value: `${brandCount.toLocaleString()}`, label: "brands" },
    { value: `${categoryCount.toLocaleString()}`, label: "categories" },
  ];

  return (
    <section className="relative overflow-hidden bg-navy">
      <Image
        src="/images/hero-editorial.jpg"
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-center opacity-50"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/40"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(248 246 241 / 0.04) 1px, transparent 1px), linear-gradient(90deg, rgb(248 246 241 / 0.04) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gold/60 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-6 lg:py-8">
        <div className="grid gap-3 lg:grid-cols-[1.55fr_1fr]">
          <div className="relative flex flex-col justify-center overflow-hidden rounded-lg border border-ivory/10 bg-navy-dark/70 p-5 backdrop-blur-sm lg:p-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-gold">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
              Yemanuel Store · Ghana
            </span>
            <h1 className="mt-3 text-balance font-display text-2xl font-medium leading-[1.1] tracking-tight text-ivory sm:text-3xl lg:text-[2.4rem]">
              Shop fashion, electronics, beauty &amp; home —{" "}
              <em className="italic text-gold">delivered across Ghana.</em>
            </h1>
            <p className="mt-2 max-w-lg text-[13px] leading-5 text-ivory/70">
              A stocked marketplace priced in GHS, with delivery built for
              every region of Ghana.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <ButtonLink href="/shop" variant="gold">
                Shop now
              </ButtonLink>
              <ButtonLink href="/shop" variant="outline-light">
                Explore categories
              </ButtonLink>
            </div>
            <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
              {stats.map((stat) => (
                <li
                  key={stat.label}
                  className="flex items-baseline gap-1.5 text-[11px] text-ivory/55"
                >
                  <span className="font-semibold text-gold">{stat.value}</span>
                  <span className="uppercase tracking-[0.14em]">{stat.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <SidePanel
              eyebrow="Flash sale"
              product={sale[0] ?? heroProduct}
              href="/shop"
              accent
            />
            <SidePanel
              eyebrow="New arrivals"
              product={newArrivals[0] ?? heroProduct}
              href="/shop"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
