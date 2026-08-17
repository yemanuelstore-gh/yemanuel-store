"use client";

import { formatGHS } from "@/lib/format";
import { POS_MAX_QUANTITY } from "@/lib/pos/types";
import { cn } from "@/lib/cn";
import { PosIcon } from "./pos-icons";

export type PosCartLine = {
  variantId: string;
  productName: string;
  variantName: string;
  sku: string;
  options: Record<string, string> | null;
  imageUrl: string | null;
  unitPrice: number;
  quantity: number;
  available: number;
};

export function cartLineTotal(line: PosCartLine): number {
  return Math.round(line.unitPrice * line.quantity * 100) / 100;
}

export function cartSubtotal(lines: PosCartLine[]): number {
  return Math.round(
    lines.reduce((total, line) => total + cartLineTotal(line), 0) * 100,
  ) / 100;
}

export function CartPanel({
  lines,
  onSetQuantity,
  onRemove,
  onClear,
  subtotal,
  total,
}: {
  lines: PosCartLine[];
  onSetQuantity: (variantId: string, quantity: number) => void;
  onRemove: (variantId: string) => void;
  onClear: () => void;
  subtotal: number;
  total: number;
}) {
  const hasLines = lines.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2">
        <h2 className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-ink-soft">
          <PosIcon name="cart" className="h-4 w-4" />
          Sale
          <span className="rounded-full bg-navy px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
            {lines.length}
          </span>
        </h2>
        {hasLines && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Clear the entire sale?")) onClear();
            }}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-danger transition-colors hover:bg-danger-soft"
          >
            <PosIcon name="trash" className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-1.5">
        {!hasLines && (
          <div className="flex h-full min-h-24 flex-col items-center justify-center gap-1.5 text-center">
            <PosIcon name="cart" className="h-6 w-6 text-ink-faint" />
            <p className="text-xs font-medium text-ink-soft">No items yet</p>
            <p className="text-[11px] text-ink-faint">
              Tap a product or scan a barcode to add it.
            </p>
          </div>
        )}
        <ul className="flex flex-col gap-1.5">
          {lines.map((line) => (
            <li
              key={line.variantId}
              className="flex items-center gap-2 rounded-md border border-line bg-white p-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium leading-4 text-ink">
                  {line.productName}
                </p>
                <p className="truncate text-[10px] leading-3.5 text-ink-faint">
                  {line.variantName}
                  {line.sku ? ` · ${line.sku}` : ""}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold tabular-nums text-navy">
                  {formatGHS(line.unitPrice)} each
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  aria-label={`Decrease quantity of ${line.productName}`}
                  onClick={() =>
                    onSetQuantity(line.variantId, Math.max(0, line.quantity - 1))
                  }
                  className="flex h-6 w-6 items-center justify-center rounded border border-line-strong text-ink-soft transition-colors hover:border-navy hover:text-navy"
                >
                  <PosIcon name="minus" className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  min={0}
                  max={POS_MAX_QUANTITY}
                  value={line.quantity}
                  aria-label={`Quantity of ${line.productName}`}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (Number.isInteger(value)) onSetQuantity(line.variantId, value);
                  }}
                  className="h-6 w-10 rounded border border-line-strong text-center text-[12px] font-semibold tabular-nums text-ink focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25"
                />
                <button
                  type="button"
                  aria-label={`Increase quantity of ${line.productName}`}
                  onClick={() =>
                    onSetQuantity(
                      line.variantId,
                      Math.min(POS_MAX_QUANTITY, line.quantity + 1),
                    )
                  }
                  className="flex h-6 w-6 items-center justify-center rounded border border-line-strong text-ink-soft transition-colors hover:border-navy hover:text-navy"
                >
                  <PosIcon name="plus" className="h-3 w-3" />
                </button>
              </div>
              <div className="w-20 text-right">
                <p className="text-[12px] font-bold tabular-nums text-ink">
                  {formatGHS(cartLineTotal(line))}
                </p>
                {line.quantity > line.available && (
                  <p className="text-[9px] font-medium text-danger">
                    Exceeds stock ({line.available})
                  </p>
                )}
              </div>
              <button
                type="button"
                aria-label={`Remove ${line.productName} from the sale`}
                onClick={() => onRemove(line.variantId)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:bg-danger-soft hover:text-danger"
              >
                <PosIcon name="close" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="shrink-0 space-y-1 border-t border-line-strong bg-ink-soft/40 px-3 py-2">
        <div className="flex items-center justify-between text-[11px] text-ink-soft">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatGHS(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-ink-soft">
          <span>Discount</span>
          <span className="tabular-nums">GH₵0.00</span>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-1.5">
          <span className="text-[13px] font-bold text-ink">Total due</span>
          <span className="text-lg font-bold tabular-nums text-navy">
            {formatGHS(total)}
          </span>
        </div>
      </div>

      {hasLines && total > 0 && (
        <p className={cn("shrink-0 px-3 py-1 text-[10px] text-ink-faint")}>
          Lines with a red “Exceeds stock” note cannot be completed until
          quantities are corrected.
        </p>
      )}
    </div>
  );
}