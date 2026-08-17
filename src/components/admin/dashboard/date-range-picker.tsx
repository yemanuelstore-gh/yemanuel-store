"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";
import type { DashboardRangeKey } from "@/lib/admin/dashboard";

const PRESETS: { key: DashboardRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "prev_business_day", label: "Prev Day" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
  { key: "since_opening", label: "Since Opening" },
];

/**
 * Business-calendar aware date range selector. Presets are links that keep
 * the current query string; the custom range posts GET from/to dates.
 */
export function DateRangePicker({
  current,
  customFrom,
  customTo,
}: {
  current: DashboardRangeKey;
  customFrom?: string;
  customTo?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (key: DashboardRangeKey) => {
    const params = new URLSearchParams(searchParams);
    params.set("range", key);
    params.delete("from");
    params.delete("to");
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((preset) => {
        const active = current === preset.key;
        return (
          <Link
            key={preset.key}
            href={hrefFor(preset.key)}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium transition-colors",
              active
                ? "border-navy bg-navy text-white"
                : "border-line-strong bg-white text-ink-soft hover:border-navy/40 hover:text-navy",
            )}
          >
            {preset.label}
          </Link>
        );
      })}

      <form
        method="get"
        action={pathname}
        className="flex items-center gap-1.5 rounded-md border border-line-strong bg-white p-1"
        onSubmit={(event) => {
          const from = (event.currentTarget.elements.namedItem("from") as HTMLInputElement)?.value;
          const to = (event.currentTarget.elements.namedItem("to") as HTMLInputElement)?.value;
          if (!from || !to) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="range" value="custom" />
        <input
          type="date"
          name="from"
          aria-label="Custom range start"
          defaultValue={customFrom ?? ""}
          min="2022-01-17"
          max={customTo ?? undefined}
          className="h-6 w-[7.2rem] rounded border border-line bg-white px-1 text-[10px] text-ink focus:border-navy focus:outline-none"
        />
        <span aria-hidden="true" className="text-[10px] text-ink-faint">
          →
        </span>
        <input
          type="date"
          name="to"
          aria-label="Custom range end"
          defaultValue={customTo ?? ""}
          min={customFrom ?? "2022-01-17"}
          max={new Date().toISOString().slice(0, 10)}
          className="h-6 w-[7.2rem] rounded border border-line bg-white px-1 text-[10px] text-ink focus:border-navy focus:outline-none"
        />
        <button
          type="submit"
          className="inline-flex h-6 items-center rounded bg-navy px-2 text-[10px] font-semibold text-white transition-colors hover:bg-navy-dark"
        >
          Apply
        </button>
      </form>
    </div>
  );
}