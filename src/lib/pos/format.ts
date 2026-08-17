import { roundMoney } from "@/lib/pricing";

/** Cash change due when the customer hands over `tendered` for `total`. */
export function changeDue(tendered: number, total: number): number {
  return roundMoney(tendered - total);
}

/**
 * Whether the tendered amount covers the total. A small tolerance absorbs
 * floating-point noise from numeric money values.
 */
export function coversTotal(tendered: number, total: number): boolean {
  return Number.isFinite(tendered) && tendered >= total - 0.005;
}

/** Render a quantity without trailing decimals when it is a whole number. */
export function formatPosQuantity(quantity: number): string {
  return Number.isInteger(quantity) ? String(quantity) : String(quantity);
}