"use client";

import { useEffect, useRef, useState } from "react";
import { searchQuotationCatalogueAction, type QuotationCatalogueItem } from "@/lib/admin/quotation-catalogue";
import { formatGHS } from "@/lib/format";
import { cn } from "@/lib/cn";
import { PosIcon } from "@/components/admin/pos/pos-icons";

/** Product/variant search overlay that adds lines to the quotation. */
export function QuotationItemPicker({
  open,
  addedVariantIds,
  onAdd,
  onClose,
}: {
  open: boolean;
  addedVariantIds: Set<string>;
  onAdd: (item: QuotationCatalogueItem) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<QuotationCatalogueItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setError(null), 0);
      searchRef.current?.focus();
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim() === "") {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const found = await searchQuotationCatalogueAction(query);
        if (!cancelled) {
          setResults(found);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Product search failed. Please try again.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  if (!open) return null;

  const activeSearch = query.trim() !== "";
  const displayed = activeSearch ? results : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Add products to the quotation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-lg border border-line-strong bg-ivory shadow-xl">
        <div className="flex shrink-0 items-center justify-between border-b border-line px-3 py-2">
          <h2 className="text-[13px] font-bold text-ink">Add products</h2>
          <button
            type="button"
            aria-label="Close product picker"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded text-ink-soft transition-colors hover:bg-line/60 hover:text-ink"
          >
            <PosIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          <div className="relative mb-2">
            <PosIcon
              name="search"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
            />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, SKU or variant…"
              className="h-8 w-full rounded-md border border-line-strong bg-white pl-8 pr-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-navy focus:outline-2 focus:outline-navy/25"
            />
          </div>

          {error && (
            <p
              role="alert"
              className="mb-2 rounded-md border border-danger/30 bg-danger-soft px-2.5 py-1.5 text-[11px] leading-4 text-danger"
            >
              {error}
            </p>
          )}

          {searching && activeSearch && (
            <p className="flex items-center gap-1.5 py-2 text-[11px] text-ink-faint">
              <PosIcon name="loader" className="h-3.5 w-3.5 animate-spin" />
              Searching…
            </p>
          )}

          {!searching && activeSearch && displayed.length === 0 && (
            <p className="py-2 text-[11px] text-ink-faint">
              No sellable products match “{query.trim()}”.
            </p>
          )}

          <ul className="flex flex-col gap-1">
            {displayed.map((item) => {
              const alreadyAdded = addedVariantIds.has(item.variantId);
              return (
                <li key={item.variantId}>
                  <button
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => {
                      onAdd(item);
                      setQuery("");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-left transition-colors",
                      alreadyAdded
                        ? "cursor-not-allowed border-line bg-line/30 opacity-60"
                        : "border-line bg-white hover:border-navy/40",
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[12px] font-medium text-ink">
                        {item.productName}
                      </span>
                      <span className="block text-[10px] text-ink-faint">
                        {item.variantName}
                        {item.sku ? ` · ${item.sku}` : ""}
                        {alreadyAdded ? " · already added" : ""}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-[12px] font-semibold tabular-nums text-navy">
                        {formatGHS(item.price)}
                      </span>
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-navy text-white">
                        <PosIcon name="plus" className="h-3.5 w-3.5" />
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}