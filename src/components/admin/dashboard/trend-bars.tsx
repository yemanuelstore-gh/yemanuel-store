import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/cn";

export type TrendBarPoint = {
  label: string;
  value: number;
  display?: string;
};

export function TrendBars({
  points,
  formatValue,
  accent = "gold",
  height = 120,
  className,
}: {
  points: TrendBarPoint[];
  formatValue?: (value: number) => string;
  accent?: "gold" | "navy";
  height?: number;
  className?: string;
}) {
  if (points.length === 0) {
    return (
      <EmptyState
        icon="reports"
        title="No data yet"
        description="Activity in this period will appear here."
      />
    );
  }

  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const barColor = accent === "gold" ? "bg-erp-gold" : "bg-erp-navy";

  return (
    <div className={cn("flex h-full flex-col justify-end", className)}>
      <div className="flex items-end gap-1.5" style={{ minHeight: height }} aria-hidden="true">
        {points.map((point) => {
          const barHeight = Math.max((point.value / maxValue) * height, point.value > 0 ? 4 : 1);
          return (
            <div
              key={point.label}
              className="group relative flex min-w-0 flex-1 flex-col items-stretch justify-end"
            >
              <div
                className={cn("rounded-t-sm transition-colors", barColor)}
                style={{ height: `${barHeight}px` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {points.map((point) => (
          <div
            key={point.label}
            className="min-w-0 flex-1 truncate text-center text-[10px] text-erp-text-muted"
            title={point.display ?? (formatValue ? formatValue(point.value) : point.label)}
          >
            {point.label}
          </div>
        ))}
      </div>
    </div>
  );
}