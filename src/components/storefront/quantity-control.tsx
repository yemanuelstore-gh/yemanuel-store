"use client";

import { removeCartItemAction, updateCartItemAction } from "@/lib/cart-actions";

async function runUpdate(formData: FormData) {
  await updateCartItemAction(formData);
}

async function runRemove(formData: FormData) {
  await removeCartItemAction(formData);
}

export function QuantityControl({
  variantId,
  quantity,
}: {
  variantId: string;
  quantity: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        role="group"
        aria-label="Quantity"
        className="flex items-center rounded-md border border-line-strong bg-white"
      >
        {quantity > 1 ? (
          <form action={runUpdate}>
            <input type="hidden" name="variantId" value={variantId} />
            <input type="hidden" name="quantity" value={String(quantity - 1)} />
            <button
              type="submit"
              aria-label="Decrease quantity"
              className="flex h-9 w-9 items-center justify-center text-ink transition-colors hover:bg-navy-soft/60 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-navy"
            >
              −
            </button>
          </form>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Decrease quantity"
            className="flex h-9 w-9 items-center justify-center text-ink-faint"
          >
            −
          </button>
        )}
        <span aria-live="polite" className="w-8 text-center text-sm font-medium text-ink">
          {quantity}
        </span>
        {quantity < 99 ? (
          <form action={runUpdate}>
            <input type="hidden" name="variantId" value={variantId} />
            <input type="hidden" name="quantity" value={String(quantity + 1)} />
            <button
              type="submit"
              aria-label="Increase quantity"
              className="flex h-9 w-9 items-center justify-center text-ink transition-colors hover:bg-navy-soft/60 focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-navy"
            >
              +
            </button>
          </form>
        ) : (
          <button
            type="button"
            disabled
            aria-label="Increase quantity"
            className="flex h-9 w-9 items-center justify-center text-ink-faint"
          >
            +
          </button>
        )}
      </div>
      <form action={runRemove}>
        <input type="hidden" name="variantId" value={variantId} />
        <button
          type="submit"
          className="text-xs font-medium text-ink-faint underline-offset-2 transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          Remove
        </button>
      </form>
    </div>
  );
}