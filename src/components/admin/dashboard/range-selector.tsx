"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const presets = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Prev Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "quarter", label: "Quarter" },
  { key: "year", label: "Year" },
  { key: "opening", label: "Since Opening" },
] as const;

export type RangeKey = (typeof presets)[number]["key"] | "custom";

export function RangeSelector({
  current,
  customStart,
  customEnd,
}: {
  current: RangeKey;
  customStart?: string;
  customEnd?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState(customStart ?? "");
  const [end, setEnd] = useState(customEnd ?? "");

  const applyCustom = () => {
    if (!start || !end) return;
    const ordered =
      start <= end ? { start, end } : { start: end, end: start };
    router.push(
      `${pathname}?range=custom&start=${ordered.start}&end=${ordered.end}`,
    );
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <div
        role="group"
        aria-label="Reporting period"
        className="inline-flex flex-wrap items-center gap-0.5 rounded-md border border-erp-border bg-white p-0.5"
      >
        {presets.map((preset) => {
          const active = preset.key === current;
          return (
            <Link
              key={preset.key}
              href={`${pathname}?range=${preset.key}`}
              aria-current={active ? "true" : undefined}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy",
                active
                  ? "bg-erp-navy text-white"
                  : "text-erp-text-secondary hover:bg-erp-canvas hover:text-erp-navy",
              )}
            >
              {preset.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="dialog"
          className={cn(
            "inline-flex items-center gap-1 rounded px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy",
            current === "custom"
              ? "bg-erp-navy text-white"
              : "text-erp-text-secondary hover:bg-erp-canvas hover:text-erp-navy",
          )}
        >
          Custom
          <Icon
            name="chevron-down"
            size={12}
            className={cn("transition-transform", open && "rotate-180")}
          />
        </button>
      </div>

      {open && (
        <>
          <div
            className="fixed inset-0 z-20"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Custom date range"
            className="absolute right-0 top-full z-30 mt-1.5 w-[340px] rounded-md border border-erp-border bg-white p-3 shadow-erp-card"
          >
            <div className="grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-erp-text-secondary">
                  Start Date
                </span>
                <Input
                  type="date"
                  compact
                  value={start}
                  max={end || undefined}
                  onChange={(event) => setStart(event.target.value)}
                  aria-label="Start date (mm/dd/yyyy)"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-erp-text-secondary">
                  End Date
                </span>
                <Input
                  type="date"
                  compact
                  value={end}
                  min={start || undefined}
                  onChange={(event) => setEnd(event.target.value)}
                  aria-label="End date (mm/dd/yyyy)"
                />
              </label>
            </div>
            <p className="mt-2 text-[11px] text-erp-text-muted">
              Use mm/dd/yyyy format. Dates are clamped to the store&apos;s
              opening day.
            </p>
            <Button
              size="sm"
              variant="primary"
              className="mt-2.5 w-full"
              disabled={!start || !end}
              onClick={applyCustom}
            >
              Apply
            </Button>
          </div>
        </>
      )}
    </div>
  );
}