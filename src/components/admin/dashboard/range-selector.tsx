"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/cn";

const RANGES = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "1Y", value: "1y" },
] as const;

/**
 * Quick range segmented control for the dashboard header.
 */
export function DashboardRangeSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRange = searchParams.get("range") || "30d";

  const setRange = (range: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", range);
    router.push(`?${params.toString()}`);
  };

  return (
    <div
      role="group"
      aria-label="Dashboard time range"
      className="flex items-center gap-0.5 rounded-xl border border-line bg-white p-1 shadow-sm"
    >
      {RANGES.map((range) => {
        const isActive = currentRange === range.value;
        return (
          <button
            key={range.value}
            type="button"
            onClick={() => setRange(range.value)}
            aria-pressed={isActive}
            className={cn(
              "h-8 cursor-pointer rounded-lg px-3.5 text-[11px] font-bold tracking-wider transition-all",
              isActive
                ? "bg-gradient-to-b from-midnight to-navy text-gold-bright shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]"
                : "text-ink-faint hover:bg-navy-soft/60 hover:text-navy",
            )}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}