"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { BarChart } from "./charts";
import { formatCompactGHS, formatNumber, weekdayLabel } from "@/lib/admin/dashboard";

type TrendMetric = "revenue" | "gross_profit" | "order_count";

type DayPoint = {
  day: string;
  revenue: number;
  gross_profit: number;
  order_count: number;
};

const METRICS: { key: TrendMetric; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "gross_profit", label: "Gross profit" },
  { key: "order_count", label: "Orders" },
];

/**
 * Daily trend panel with a metric toggle (Revenue / Gross profit / Orders).
 * The underlying data is fetched server-side; only the rendering/selection
 * is interactive.
 */
export function TrendPanel({
  points,
  subtitle,
  height = 230,
}: {
  points: DayPoint[];
  subtitle: string;
  height?: number;
}) {
  const [metric, setMetric] = useState<TrendMetric>("revenue");

  const data = points.map((point) => ({
    label: weekdayLabel(point.day),
    value: point[metric],
  }));

  const formatValue = metric === "order_count" ? formatNumber : formatCompactGHS;
  const color = metric === "revenue" ? "#0b1f33" : metric === "gross_profit" ? "#c9a227" : "#15243e";

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium text-ink-soft">{subtitle}</p>
        <div
          role="tablist"
          aria-label="Trend metric"
          className="flex items-center gap-0.5 rounded-lg border border-line bg-white p-0.5 shadow-sm"
        >
          {METRICS.map((item) => {
            const active = metric === item.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMetric(item.key)}
                className={cn(
                  "cursor-pointer rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
                  active
                    ? "bg-navy text-gold-bright shadow-sm"
                    : "text-ink-faint hover:bg-navy-soft/60 hover:text-navy",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <BarChart data={data} formatValue={formatValue} height={height} color={color} />
    </div>
  );
}