import Link from "next/link";
import { ProductImage } from "@/components/storefront/product-image";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { SectionHeader } from "@/components/storefront/section-header";
import { formatGHS } from "@/lib/format";
import type { BestSellerItem } from "@/lib/catalogue";

function discountPercent(item: BestSellerItem): number | null {
  if (
    !item.hasSale ||
    item.salePrice === null ||
    item.price === null ||
    item.price <= 0
  ) {
    return null;
  }
  return Math.round((1 - item.salePrice / item.price) * 100);
}

function BestSellerCard({ item }: { item: BestSellerItem }) {
  const mainPrice =
    item.hasSale && item.salePrice !== null ? item.salePrice : item.price;
  const discount = discountPercent(item);

  return (
    <article className="group w-[148px] shrink-0 snap-start rounded-lg border border-line bg-paper p-2 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-lifted sm:w-[168px]">
      <div className="image-shine relative aspect-[4/5] overflow-hidden rounded-md border border-line bg-navy-soft transition-colors duration-300 group-hover:border-gold/60">
        <Link
          href={`/shop/${item.productSlug}`}
          aria-label={item.productName}
          className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <ProductImage
            src={item.imageUrl}
            alt={item.imageAlt ?? item.productName}
            sizes="(min-width: 640px) 168px, 148px"
            fallbackLetter={item.productName.charAt(0)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        </Link>
        <span className="absolute left-2 top-2 rounded-sm bg-gold px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-navy-dark">
          Best Seller
        </span>
        {discount !== null && (
          <span className="absolute right-2 top-2 rounded-sm bg-navy/90 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-gold backdrop-blur-sm">
            −{discount}%
          </span>
        )}
        <span className="absolute bottom-2 right-2">
          <WishlistButton
            className="h-6 w-6"
            product={{
              slug: item.productSlug,
              name: item.productName,
              imageUrl: item.imageUrl,
              price: item.price,
              salePrice: item.salePrice,
              hasSale: item.hasSale,
            }}
          />
        </span>
      </div>
      {item.categoryName && (
        <p className="mt-2 truncate text-[9px] font-medium uppercase tracking-[0.14em] text-ink-faint">
          {item.categoryName}
        </p>
      )}
      <Link
        href={`/shop/${item.productSlug}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <h3 className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-ink transition-colors group-hover:text-navy">
          {item.productName}
        </h3>
      </Link>
      <p className="mt-1 text-xs font-semibold text-ink">
        {mainPrice !== null ? formatGHS(mainPrice) : "Price on request"}
        {item.hasSale && item.salePrice !== null && (
          <span className="ml-1.5 text-[10px] font-medium text-ink-faint line-through">
            {formatGHS(item.price ?? 0)}
          </span>
        )}
      </p>
      <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-gold-dark">
        {item.unitsSold} sold
      </p>
    </article>
  );
}

/**
 * "Best sellers" rail ranked by real customer order quantities. Hidden
 * entirely until the store has order history — nothing is simulated.
 */
export function BestSellerRail({ items }: { items: BestSellerItem[] }) {
  if (items.length === 0) return null;

  return (
    <section className="border-t border-line bg-ivory">
      <div className="mx-auto max-w-6xl px-4 py-9 lg:py-12">
        <SectionHeader
          eyebrow="Customer favourites"
          title="Best sellers"
          description="The most-ordered items on Yemanuel Store, ranked by real customer orders."
          actionHref="/shop"
          actionLabel="Shop the store"
        />

        <div className="mt-6 flex snap-x gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => (
            <BestSellerCard key={item.productId} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}