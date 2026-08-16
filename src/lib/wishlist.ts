/**
 * Client-side wishlist stored in localStorage. No database involved —
 * the wishlist lives in the shopper's browser.
 */

export type WishlistItem = {
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number | null;
  salePrice: number | null;
  hasSale: boolean;
  addedAt: string;
};

const STORAGE_KEY = "yemanuel-wishlist";

export const WISHLIST_CHANGE_EVENT = "yemanuel:wishlist-change";

function parseStored(raw: string | null): WishlistItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is WishlistItem =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as WishlistItem).slug === "string",
    );
  } catch {
    return [];
  }
}

export function readWishlist(): WishlistItem[] {
  if (typeof window === "undefined") return [];
  return parseStored(window.localStorage.getItem(STORAGE_KEY));
}

function writeWishlist(items: WishlistItem[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(WISHLIST_CHANGE_EVENT));
}

export function isWishlisted(slug: string): boolean {
  return readWishlist().some((item) => item.slug === slug);
}

export function toggleWishlist(
  item: Omit<WishlistItem, "addedAt">,
): boolean {
  const current = readWishlist();
  const exists = current.some((entry) => entry.slug === item.slug);
  const next = exists
    ? current.filter((entry) => entry.slug !== item.slug)
    : [...current, { ...item, addedAt: new Date().toISOString() }];
  writeWishlist(next);
  return !exists;
}

export function removeFromWishlist(slug: string): void {
  writeWishlist(readWishlist().filter((entry) => entry.slug !== slug));
}

export function wishlistCount(): number {
  return readWishlist().length;
}