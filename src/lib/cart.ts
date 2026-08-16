import { cookies } from "next/headers";

export type CartItem = {
  variantId: string;
  quantity: number;
};

const CART_COOKIE = "ys_cart";
const MAX_LINES = 30;
const MAX_QUANTITY = 99;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function clampQuantity(quantity: number): number {
  if (!Number.isInteger(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, quantity));
}

export function parseCartItems(raw: string | undefined): CartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items: CartItem[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "object" || entry === null) continue;
      const variantId = (entry as { variantId?: unknown }).variantId;
      const quantity = (entry as { quantity?: unknown }).quantity;
      if (typeof variantId !== "string" || !UUID_RE.test(variantId)) continue;
      if (typeof quantity !== "number" || !Number.isInteger(quantity)) continue;
      items.push({ variantId, quantity: clampQuantity(quantity) });
    }
    return items.slice(0, MAX_LINES);
  } catch {
    return [];
  }
}

export async function readCart(): Promise<CartItem[]> {
  const store = await cookies();
  return parseCartItems(store.get(CART_COOKIE)?.value);
}

export async function writeCart(items: CartItem[]): Promise<void> {
  const store = await cookies();
  store.set(CART_COOKIE, JSON.stringify(items), {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function addItem(
  items: CartItem[],
  variantId: string,
  quantity: number,
): CartItem[] {
  const next = [...items];
  const existing = next.find((item) => item.variantId === variantId);
  if (existing) {
    existing.quantity = clampQuantity(existing.quantity + quantity);
  } else {
    if (next.length >= MAX_LINES) return next;
    next.push({ variantId, quantity: clampQuantity(quantity) });
  }
  return next;
}

export function updateItem(
  items: CartItem[],
  variantId: string,
  quantity: number,
): CartItem[] {
  const next = [...items];
  const existing = next.find((item) => item.variantId === variantId);
  if (existing) existing.quantity = clampQuantity(quantity);
  return next;
}

export function removeItem(items: CartItem[], variantId: string): CartItem[] {
  return items.filter((item) => item.variantId !== variantId);
}