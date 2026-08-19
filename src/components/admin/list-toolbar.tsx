import type { ReactNode } from "react";
import Link from "next/link";
import { Select } from "@/components/ui/select";
import { Icon } from "@/components/ui/icons";

export type ListToolbarFilter = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  value?: string;
};

export function ListToolbar({
  baseHref,
  q,
  filters = [],
  count,
  actions,
  searchPlaceholder = "Search…",
}: {
  baseHref: string;
  q?: string;
  filters?: ListToolbarFilter[];
  count?: string;
  actions?: ReactNode;
  searchPlaceholder?: string;
}) {
  const hasActiveFilters =
    Boolean(q?.trim()) || filters.some((filter) => Boolean(filter.value));

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-2.5">
      <form
        action={baseHref}
        method="get"
        className="flex flex-wrap items-center gap-2"
      >
        <label className="relative">
          <Icon
            name="search"
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-text-muted"
          />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={searchPlaceholder}
            className="h-8 w-56 rounded-md border border-erp-border bg-erp-canvas/50 pl-8 pr-3 text-xs text-erp-text placeholder:text-erp-text-muted focus:border-erp-navy focus:bg-white focus:outline-2 focus:outline-offset-0 focus:outline-erp-navy/25"
          />
        </label>
        {filters.map((filter) => (
          <Select
            key={filter.name}
            name={filter.name}
            compact
            defaultValue={filter.value}
            aria-label={filter.label}
          >
            <option value="">All {filter.label.toLowerCase()}</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        ))}
        <button
          type="submit"
          className="h-8 rounded-md bg-erp-navy px-3 text-xs font-medium text-white transition-colors hover:bg-erp-navy-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
        >
          Apply
        </button>
        {hasActiveFilters && (
          <Link
            href={baseHref}
            className="h-8 rounded-md px-2 text-xs text-erp-text-secondary hover:text-erp-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
          >
            Clear
          </Link>
        )}
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {count && <span className="text-xs text-erp-text-muted">{count}</span>}
        {actions}
      </div>
    </div>
  );
}