import Link from "next/link";
import { ProductImage } from "@/components/storefront/product-image";
import { QuickView } from "@/components/storefront/quick-view";
import { WishlistButton } from "@/components/storefront/wishlist-button";
import { formatGHS, isNewArrival } from "@/lib/format";
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

export function ProductCard({
  product,
  priority = false,
}: {
  product: ShopProduct;
  priority?: boolean;
}) {
  const mainPrice =
    product.hasSale && product.salePrice !== null ? product.salePrice : product.price;
  const originalPrice =
    product.hasSale && product.salePrice !== null ? product.price : null;
  const discount = discountPercent(product);
  const isNew = isNewArrival(product.createdAt);

  const categoryLabel = product.brandName ?? product.categoryName ?? "Yemanuel Store";
  const labelHref = product.brandSlug
    ? `/brands/${product.brandSlug}`
    : product.categorySlug
      ? `/categories/${product.categorySlug}`
      : null;

  return (
    <article className="group">
      {labelHref ? (
        <Link
          href={labelHref}
          className="block pb-1.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
          aria-label={`Browse ${categoryLabel} products`}
        >
          <p className="truncate text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint transition-colors hover:text-navy group-hover:text-navy">
            {categoryLabel}
          </p>
        </Link>
      ) : (
        <p className="truncate pb-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-ink-faint">
          {categoryLabel}
        </p>
      )}

      <div className="image-shine relative aspect-[4/5] overflow-hidden rounded-md border border-line bg-navy-soft shadow-soft transition-all duration-300 group-hover:border-gold/60 group-hover:shadow-lifted">
        <Link
          href={`/shop/${product.slug}`}
          aria-label={product.name}
          className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <ProductImage
            src={product.imageUrl}
            alt={product.imageAlt ?? product.name}
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            priority={priority}
            fallbackLetter={product.name.charAt(0)}
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        </Link>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/35 via-navy/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        />

        {(product.hasSale || isNew) && (
          <div className="absolute left-2.5 top-2.5 flex flex-col items-start gap-1">
            {product.hasSale && (
              <span className="rounded-sm bg-gold px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-navy-dark">
                Sale
              </span>
            )}
            {isNew && (
              <span className="rounded-sm bg-navy px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-gold">
                New
              </span>
            )}
          </div>
        )}
        {discount !== null && (
          <span className="absolute right-2.5 top-2.5 rounded-sm bg-navy/90 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-gold backdrop-blur-sm">
            −{discount}%
          </span>
        )}
        <span className="absolute right-2.5 top-10 z-10">
          <WishlistButton
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

        <div className="absolute inset-x-3 bottom-3 z-10 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100">
          <QuickView product={product} />
        </div>
      </div>

      <div className="pt-2">
        <Link
          href={`/shop/${product.slug}`}
          className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-navy"
        >
          <h3 className="line-clamp-2 text-xs font-medium leading-snug text-ink transition-colors group-hover:text-navy">
            {product.name}
          </h3>
        </Link>
        {!product.available && (
          <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-danger">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-danger" />
            Unavailable
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          {mainPrice !== null && (
            <p
              className={cn(
                "text-[13px] font-semibold",
                product.hasSale ? "text-gold-dark" : "text-ink",
              )}
            >
              {formatGHS(mainPrice)}
            </p>
          )}
          {originalPrice !== null && (
            <p className="text-[11px] text-ink-faint line-through">
              {formatGHS(originalPrice)}
            </p>
          )}
          {discount !== null && (
            <p
              aria-hidden="true"
              className="text-[10px] font-bold text-gold-dark"
            >
              −{discount}%
            </p>
          )}
        </div>
      </div>
    </article>
  );
}