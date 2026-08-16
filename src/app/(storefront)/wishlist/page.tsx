"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "@/components/storefront/breadcrumbs";
import { ButtonLink } from "@/components/storefront/button-link";
import { ProductImage } from "@/components/storefront/product-image";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  readWishlist,
  removeFromWishlist,
  WISHLIST_CHANGE_EVENT,
  type WishlistItem,
} from "@/lib/wishlist";

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setItems(readWishlist());
      setMounted(true);
    };
    refresh();
    window.addEventListener(WISHLIST_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(WISHLIST_CHANGE_EVENT, refresh);
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
      <Breadcrumbs
        items={[{ label: "Home", href: "/" }, { label: "Wishlist" }]}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">
            Saved for later
          </p>
          <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink lg:text-4xl">
            Your wishlist
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-ink-soft">
            Items you saved on this browser. Saved prices are from when you
            added them — the live price is shown on each product page.
          </p>
        </div>
        {items.length > 0 && (
          <ButtonLink href="/shop" variant="gold">
            Shop the catalogue
          </ButtonLink>
        )}
      </div>

      {!mounted ? (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="aspect-[4/5] animate-pulse rounded-md border border-line bg-navy-soft"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-lg border border-dashed border-line-strong bg-paper p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-gradient-to-br from-navy to-navy-dark">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-gold"
            >
              <path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z" />
            </svg>
          </div>
          <p className="mt-5 font-display text-xl font-medium text-ink">
            Nothing saved yet
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
            Tap the heart on any product to save it here. Your wishlist lives
            in this browser and stays until you remove items.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/shop" variant="gold">
              Browse the shop
            </ButtonLink>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((item) => {
            const mainPrice =
              item.hasSale && item.salePrice !== null
                ? item.salePrice
                : item.price;
            return (
              <article key={item.slug} className="group">
                <div className="image-shine relative aspect-[4/5] overflow-hidden rounded-md border border-line bg-navy-soft shadow-soft transition-all duration-300 group-hover:border-gold/60 group-hover:shadow-lifted">
                  <Link
                    href={`/shop/${item.slug}`}
                    aria-label={item.name}
                    className="absolute inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                  >
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                      fallbackLetter={item.name.charAt(0)}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.05]"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFromWishlist(item.slug)}
                    aria-label={`Remove ${item.name} from wishlist`}
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-gold bg-gold text-navy-dark shadow-soft transition-colors hover:bg-gold-dark hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
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
                </div>
                <Link
                  href={`/shop/${item.slug}`}
                  className="mt-3 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  <h3 className="line-clamp-2 text-sm font-medium leading-snug text-ink transition-colors group-hover:text-navy">
                    {item.name}
                  </h3>
                </Link>
                <p className="mt-1.5 text-sm font-semibold text-ink">
                  {mainPrice !== null ? formatGHS(mainPrice) : "Price on request"}
                  {item.hasSale && item.salePrice !== null && (
                    <span className="ml-2 text-xs font-medium text-ink-faint line-through">
                      {formatGHS(item.price ?? 0)}
                    </span>
                  )}
                </p>
                <Link
                  href={`/shop/${item.slug}`}
                  className={cn(
                    "mt-2 inline-flex h-9 w-full items-center justify-center rounded-md border border-line-strong bg-paper text-xs font-semibold text-ink shadow-soft transition-colors hover:border-gold/60 hover:bg-gold-soft hover:text-gold-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy",
                  )}
                >
                  View product
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}