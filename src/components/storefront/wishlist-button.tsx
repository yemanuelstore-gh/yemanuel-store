"use client";

import { useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import {
  isWishlisted,
  toggleWishlist,
  WISHLIST_CHANGE_EVENT,
  type WishlistItem,
} from "@/lib/wishlist";

function subscribeToWishlist(onStoreChange: () => void) {
  window.addEventListener(WISHLIST_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(WISHLIST_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
    </svg>
  );
}

/**
 * Heart toggle that persists to the browser's localStorage wishlist.
 */
export function WishlistButton({
  product,
  className,
  label = "Add to wishlist",
}: {
  product: Omit<WishlistItem, "addedAt">;
  className?: string;
  label?: string;
}) {
  const active = useSyncExternalStore(
    subscribeToWishlist,
    () => isWishlisted(product.slug),
    () => false,
  );

  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? `Remove ${product.name} from wishlist` : label}
      onClick={() => toggleWishlist(product)}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-full border shadow-soft transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy",
        active
          ? "border-gold bg-gold text-navy-dark"
          : "border-line bg-paper/95 text-ink-soft hover:border-gold/60 hover:text-gold-dark",
        className,
      )}
    >
      <HeartIcon filled={active} />
    </button>
  );
}