import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCompactGHS } from "@/lib/admin/dashboard";

export type SalesChartPoint = {
  day: string;
  revenue: number;
  gross_profit: number;
  order_count: number;
};

const WIDTH = 720;
const HEIGHT = 240;
const PAD_TOP = 16;
const PAD_RIGHT = 12;
const PAD_BOTTOM = 26;
const PAD_LEFT = 52;

function shortLabel(day: string): string {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, dayOfMonth));
  const label = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return label.replace(/ /g, " ");
}

function monthLabel(day: string): string {
  const [year, month] = day.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-GB", { month: "short", year: "2-digit" });
}

function buildPath(points: { value: number }[], x: (i: number) => number, y: (v: number) => number): string {
  if (points.length === 0) return "";
  const coords = points.map((point, i) => `${x(i).toFixed(1)},${y(point.value).toFixed(1)}`);
  return `M${coords.join(" L")}`;
}

export function SalesChart({
  points,
  monthly,
  loading,
}: {
  points: SalesChartPoint[];
  monthly: boolean;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs text-erp-text-secondary">
        <span className="size-3.5 animate-spin rounded-full border-2 border-erp-border border-t-erp-navy" />
        <span className="ml-2.5">Loading trend…</span>
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <EmptyState
        icon="reports"
        title="No sales in this period"
        description="There are no orders in the selected date range."
      />
    );
  }

  const maxValue = Math.max(
    ...points.map((point) => Math.max(point.revenue, point.gross_profit)),
    1,
  );
  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const x = (i: number) =>
    PAD_LEFT + (points.length === 1 ? plotWidth / 2 : (i * plotWidth) / (points.length - 1));
  const y = (value: number) => PAD_TOP + plotHeight * (1 - value / maxValue);

  const areaPath = `${buildPath(
    points.map((point) => ({ value: point.revenue })),
    x,
    y,
  )} L ${x(points.length - 1).toFixed(1)},${(PAD_TOP + plotHeight).toFixed(1)} L ${PAD_LEFT},${(PAD_TOP + plotHeight).toFixed(1)} Z`;

  const linePath = buildPath(
    points.map((point) => ({ value: point.gross_profit })),
    x,
    y,
  );

  const ticks = 4;
  const tickStep = maxValue / ticks;
  const gridLines = Array.from({ length: ticks + 1 }, (_, i) => {
    const value = tickStep * i;
    const yPos = y(value);
    const isFirst = i === 0;
    return (
      <g key={i}>
        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={yPos}
          y2={yPos}
          stroke="currentColor"
          className="text-erp-border"
          strokeDasharray={isFirst ? undefined : "3 4"}
        />
        <text
          x={PAD_LEFT - 8}
          y={yPos + 3}
          textAnchor="end"
          className="fill-erp-text-muted text-[10px]"
        >
          {formatCompactGHS(value)}
        </text>
      </g>
    );
  });

  const labelStep = Math.ceil(points.length / 12);
  const xLabels = points.map((point, i) =>
    i % labelStep === 0 || i === points.length - 1 ? (
      <text
        key={point.day}
        x={x(i)}
        y={HEIGHT - 8}
        textAnchor="middle"
        className="fill-erp-text-muted text-[10px]"
      >
        {monthly ? monthLabel(point.day) : shortLabel(point.day)}
      </text>
    ) : null,
  );

  const showLegend = points.length > 0;

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-end gap-4 text-[11px] font-medium text-erp-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-3 rounded-full bg-erp-gold" aria-hidden="true" />
          Revenue
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-3 rounded-full bg-erp-navy" aria-hidden="true" />
          Gross profit
        </span>
      </div>
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label="Sales performance chart"
          className="h-auto min-w-[480px] w-full"
        >
          <defs>
            <linearGradient id="sales-revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(244 180 0 / 0.22)" />
              <stop offset="100%" stopColor="rgb(244 180 0 / 0.02)" />
            </linearGradient>
          </defs>

          <g>{gridLines}</g>

          <path d={areaPath} fill="url(#sales-revenue-fill)" />
          <path
            d={buildPath(
              points.map((point) => ({ value: point.revenue })),
              x,
              y,
            )}
            fill="none"
            stroke="#f4b400"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={linePath}
            fill="none"
            stroke="#0b1f33"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, i) => (
            <g key={point.day}>
              <circle
                cx={x(i)}
                cy={y(point.revenue)}
                r={3}
                className="fill-erp-gold"
                stroke="#fff"
                strokeWidth={1.5}
                aria-label={`${monthly ? monthLabel(point.day) : shortLabel(point.day)} — Revenue ${formatCompactGHS(point.revenue)} · Gross profit ${formatCompactGHS(point.gross_profit)} · ${point.order_count} order${point.order_count === 1 ? "" : "s"}`}
              />
            </g>
          ))}

          {showLegend && <g>{xLabels}</g>}
        </svg>
      </div>
    </div>
  );
}

export function ChartSummaryStat({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: string;
  accent?: "gold" | "navy";
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold tabular-nums tracking-tight",
          accent === "gold" ? "text-erp-gold-hover" : accent === "navy" ? "text-erp-navy" : "text-erp-text",
        )}
      >
        {value}
      </p>
    </div>
  );
}