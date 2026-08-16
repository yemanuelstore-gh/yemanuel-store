"use client";

import { useRouter } from "next/navigation";
import type { ShopSort } from "@/lib/catalogue";

const SORT_OPTIONS: { value: ShopSort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
];

export function SortSelect({
  value,
  basePath = "/shop",
}: {
  value: ShopSort;
  basePath?: string;
}) {
  const router = useRouter();

  return (
    <label className="flex items-center gap-2 text-sm text-ink-soft">
      <span className="sr-only">Sort products</span>
      <select
        value={value}
        onChange={(event) => {
          const params = new URLSearchParams(window.location.search);
          if (event.target.value === "newest") params.delete("sort");
          else params.set("sort", event.target.value);
          const query = params.toString();
          router.push(query ? `${basePath}?${query}` : basePath);
        }}
        className="h-9 rounded-md border border-line-strong bg-white px-3 text-sm font-medium text-ink transition-colors hover:border-navy/50 focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}