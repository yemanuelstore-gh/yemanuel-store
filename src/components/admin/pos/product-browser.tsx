"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { searchPosCatalogueAction } from "@/lib/pos/catalogue";
import type { PosCatalogueItem, PosCategory } from "@/lib/pos/types";
import { cn } from "@/lib/cn";
import { ProductTile } from "./product-tile";
import { PosIcon } from "./pos-icons";

export function ProductBrowser({
  initialItems,
  categories,
  locationId,
  initialLocationId,
  searchInputRef,
  onAdd,
}: {
  initialItems: PosCatalogueItem[];
  categories: PosCategory[];
  locationId: string | null;
  initialLocationId: string | null;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onAdd: (item: PosCatalogueItem) => void;
}) {
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [results, setResults] = useState<PosCatalogueItem[]>(initialItems);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query === "" && categoryId === null && locationId === initialLocationId) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const items = await searchPosCatalogueAction({
          q: query.trim(),
          categoryId,
          locationId,
        });
        if (!cancelled) {
          setResults(items);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Search failed. Please try again.");
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, categoryId, locationId, initialLocationId, initialItems]);

  const showingInitial =
    query === "" && categoryId === null && locationId === initialLocationId;
  const displayedResults = showingInitial ? initialItems : results;

  const handleBarcodeEnter = async () => {
    const value = barcode.trim();
    if (value === "") return;
    setSearching(true);
    setError(null);
    try {
      const matches = await searchPosCatalogueAction({ barcode: value, locationId });
      if (matches.length > 0) {
        onAdd(matches[0]);
        setBarcode("");
      } else {
        setError(`No sellable product matches barcode ${value}.`);
      }
    } catch {
      setError("Barcode lookup failed. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <div className="relative min-w-0 flex-1">
          <PosIcon
            name="search"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          />
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products, SKU or barcode…  ( / )"
            aria-label="Search products"
            className="h-8 w-full rounded-md border border-line-strong bg-white pl-8 pr-2 text-[13px] text-ink placeholder:text-ink-faint transition-colors focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25"
          />
        </div>
        <div className="relative w-36 shrink-0">
          <PosIcon
            name="barcode"
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          />
          <input
            ref={barcodeInputRef}
            type="text"
            inputMode="numeric"
            value={barcode}
            onChange={(event) => setBarcode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void handleBarcodeEnter();
              }
            }}
            placeholder="Scan barcode"
            aria-label="Scan barcode"
            className="h-8 w-full rounded-md border border-line-strong bg-white pl-8 pr-2 font-mono text-[13px] text-ink placeholder:text-ink-faint transition-colors focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-b border-line px-3 py-1.5">
        <button
          type="button"
          onClick={() => setCategoryId(null)}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
            categoryId === null
              ? "border-navy bg-navy text-white"
              : "border-line-strong bg-white text-ink-soft hover:border-navy/40 hover:text-navy",
          )}
        >
          All
        </button>
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() =>
              setCategoryId((current) =>
                current === category.id ? null : category.id,
              )
            }
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
              categoryId === category.id
                ? "border-navy bg-navy text-white"
                : "border-line-strong bg-white text-ink-soft hover:border-navy/40 hover:text-navy",
            )}
          >
            {category.name}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {error && (
          <p
            role="alert"
            className="mb-2 rounded-md border border-danger/30 bg-danger-soft px-2.5 py-1.5 text-[11px] leading-4 text-danger"
          >
            {error}
          </p>
        )}
        {searching && !showingInitial ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink-faint">
            <PosIcon name="loader" className="h-4 w-4 animate-spin" />
            Searching…
          </div>
        ) : displayedResults.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-10 text-center">
            <PosIcon name="package" className="h-6 w-6 text-ink-faint" />
            <p className="text-xs font-semibold text-ink">No products found</p>
            <p className="text-[11px] text-ink-faint">
              Try a different search term or category.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 2xl:grid-cols-4">
            {displayedResults.map((item) => (
              <ProductTile key={item.variantId} item={item} onAdd={onAdd} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}