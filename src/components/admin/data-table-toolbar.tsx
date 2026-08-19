import type { ReactNode } from "react";
import { Icon } from "@/components/ui/icons";

export type DataTableToolbarProps = {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  actions?: ReactNode;
  count?: ReactNode;
};

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  filters,
  actions,
  count,
}: DataTableToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-erp-border px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <label className="relative">
            <Icon
              name="search"
              size={13}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-erp-text-muted"
            />
            <input
              type="search"
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 w-56 rounded-md border border-erp-border bg-erp-canvas/50 pl-8 pr-3 text-xs text-erp-text placeholder:text-erp-text-muted focus:border-erp-navy focus:bg-white focus:outline-2 focus:outline-offset-0 focus:outline-erp-navy/25"
            />
          </label>
        )}
        {filters}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {count && (
          <span className="text-xs text-erp-text-muted">{count}</span>
        )}
        {actions}
      </div>
    </div>
  );
}