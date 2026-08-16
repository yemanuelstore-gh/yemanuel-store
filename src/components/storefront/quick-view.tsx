"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

function QuickViewDialog({
  product,
  onClose,
}: {
  product: ShopProduct;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const mainPrice =
    product.hasSale && product.salePrice !== null ? product.salePrice : product.price;
  const originalPrice =
    product.hasSale && product.salePrice !== null ? product.price : null;
  const discount = discountPercent(product);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Quick view of ${product.name}`}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Close quick view"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-navy/60 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-lg border border-line bg-paper shadow-lifted">
        <button
          type="button"
          aria-label="Close quick view"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper/95 text-ink-soft shadow-soft transition-colors hover:border-gold/60 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="grid max-h-[85vh] gap-0 overflow-y-auto sm:grid-cols-[240px_1fr]">
          <div className="relative aspect-[4/5] bg-navy-soft sm:aspect-auto sm:min-h-full">
            <ProductImage
              src={product.imageUrl}
              alt={product.imageAlt ?? product.name}
              sizes="240px"
              fallbackLetter={product.name.charAt(0)}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {discount !== null && (
              <span className="absolute right-3 top-3 rounded-sm bg-navy px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
                −{discount}%
              </span>
            )}
          </div>

          <div className="flex flex-col p-5 sm:p-6">
            {product.categoryName && (
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-ink-faint">
                {product.categoryName}
              </p>
            )}
            <h3 className="mt-2 font-display text-xl font-medium leading-snug tracking-tight text-ink">
              {product.name}
            </h3>
            <div className="mt-3 flex items-baseline gap-2">
              {mainPrice !== null && (
                <p className="text-xl font-semibold text-gold-dark">
                  {formatGHS(mainPrice)}
                </p>
              )}
              {originalPrice !== null && (
                <p className="text-sm text-ink-faint line-through">
                  {formatGHS(originalPrice)}
                </p>
              )}
              {mainPrice === null && (
                <p className="text-sm text-ink-soft">Price on request</p>
              )}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-soft">
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  product.available ? "bg-navy" : "bg-ink-faint",
                )}
              />
              {product.available ? "Available" : "Currently unavailable"}
            </p>

            <div className="mt-6 flex flex-col gap-2.5">
              <Link
                href={`/shop/${product.slug}`}
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-md bg-gold px-4 text-sm font-semibold text-navy-dark shadow-soft transition-colors hover:bg-gold-dark hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
              >
                View full details
                <span aria-hidden="true" className="ml-2">→</span>
              </Link>
              <Link
                href={`/shop/${product.slug}`}
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-md border border-line-strong bg-paper px-4 text-sm font-medium text-ink shadow-soft transition-colors hover:border-navy/40 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                Choose options & add to cart
              </Link>
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
              <p className="text-xs text-ink-faint">
                Prices in GHS · Delivered across Ghana
              </p>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * "Quick view" trigger rendered on product cards. Opens a compact dialog
 * with the essentials and a link through to the full product page.
 */
export function QuickView({ product }: { product: ShopProduct }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 flex-1 items-center justify-center rounded-md bg-navy/85 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-ivory backdrop-blur-sm transition-colors hover:bg-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        Quick view
      </button>
      {open && <QuickViewDialog product={product} onClose={() => setOpen(false)} />}
    </>
  );
}