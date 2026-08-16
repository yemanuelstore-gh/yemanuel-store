import Link from "next/link";
import { ProductImage } from "@/components/storefront/product-image";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/cn";
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

/**
 * Compact horizontal-rail product card shared by the marketplace rails
 * (flash sale, new arrivals and department strips).
 */
export function RailProductCard({
  product,
  badge = null,
}: {
  product: ShopProduct;
  badge?: "New" | "Sale" | null;
}) {
  const mainPrice =
    product.hasSale && product.salePrice !== null ? product.salePrice : product.price;
  const originalPrice =
    product.hasSale && product.salePrice !== null ? product.price : null;
  const discount = discountPercent(product);

  return (
    <article className="group w-[148px] shrink-0 snap-start rounded-lg border border-line bg-paper p-2 shadow-soft transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-lifted sm:w-[168px]">
      <div className="image-shine relative aspect-[4/5] overflow-hidden rounded-md border border-line bg-navy-soft transition-colors duration-300 group-hover:border-gold/60">
        <Link
          href={`/shop/${product.slug}`}
          aria-label={product.name}
          className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            sizes="(min-width: 640px) 168px, 148px"
            fallbackLetter={product.name.charAt(0)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        </Link>
        {badge && (
          <span
            className={cn(
              "absolute left-2 top-2 rounded-sm px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em]",
              badge === "New" ? "bg-navy text-gold" : "bg-gold text-navy-dark",
            )}
          >
            {badge}
          </span>
        )}
        {discount !== null && (
          <span className="absolute right-2 top-2 rounded-sm bg-navy/90 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-[0.1em] text-gold backdrop-blur-sm">
            −{discount}%
          </span>
        )}
        <span className="absolute bottom-2 right-2">
          <WishlistButton
            className="h-6 w-6"
            product={{
              slug: product.slug,
              name: product.name,
              imageUrl: product.imageUrl,
              price: product.price,
              salePrice: product.salePrice,
              hasSale: product.hasSale,
            }}
          />
        </span>
      </div>
      <p className="mt-2 truncate text-[9px] font-medium uppercase tracking-[0.14em] text-ink-faint">
        {product.brandName ?? product.categoryName ?? "Yemanuel Store"}
      </p>
      <Link
        href={`/shop/${product.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        <h3 className="mt-0.5 line-clamp-2 text-[11px] font-medium leading-snug text-ink transition-colors group-hover:text-navy">
          {product.name}
        </h3>
      </Link>
      <p className="mt-1 text-xs font-semibold text-ink">
        {mainPrice !== null ? formatGHS(mainPrice) : "Price on request"}
        {originalPrice !== null && (
          <span className="ml-1.5 text-[10px] font-medium text-ink-faint line-through">
            {formatGHS(originalPrice)}
          </span>
        )}
      </p>
    </article>
  );
}