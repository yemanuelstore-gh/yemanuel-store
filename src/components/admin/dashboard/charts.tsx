import { cn } from "@/lib/cn";

/**
 * Lightweight, dependency-free charts. Pure SVG/CSS — no chart library is
 * needed for the ERP dashboard's compact bars and breakdowns, keeping the
 * admin bundle small and server-rendered.
 */

export type ChartPoint = { label: string; value: number };

const DEFAULT_BAR = "#0b1f33";
const GOLD_BAR = "#c9a227";

/**
 * Vertical bar chart. Renders as a row of proportionally sized bars with
 * native tooltips. Value labels are shown when the series is short.
 */
export function BarChart({
  data,
  formatValue,
  height = 120,
  color = DEFAULT_BAR,
  className,
  valueLabels = false,
}: {
  data: ChartPoint[];
  formatValue: (value: number) => string;
  height?: number;
  color?: string;
  className?: string;
  valueLabels?: boolean;
}) {
  if (data.length === 0) {
    return <EmptyChart note="No data for this period yet." />;
  }

  const max = Math.max(...data.map((point) => point.value), 1);
  const showLabels = valueLabels || data.length <= 12;
  const labelEvery = Math.ceil(data.length / 8);
  const rootClassName = className;

  return (
    <div className={rootClassName}>
      <div className="flex items-end gap-px" style={{ height }} aria-hidden="false">
        {data.map((point, index) => {
          const heightPct = point.value > 0 ? Math.max((point.value / max) * 100, 2) : 1;
          return (
            <div
              key={point.label + index}
              className="group relative flex flex-1 flex-col justify-end"
              style={{ height: "100%" }}
            >
              {showLabels && point.value > 0 && (
                <span className="mb-0.5 hidden truncate text-center text-[9px] leading-3 text-ink-faint sm:block">
                  {formatValue(point.value)}
                </span>
              )}
              <div
                className="w-full rounded-t-[2px] transition-colors"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: point.value > 0 ? color : "rgba(17, 24, 39, 0.08)",
                  minHeight: point.value > 0 ? 3 : 2,
                }}
                title={`${point.label}: ${formatValue(point.value)}`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex items-end gap-px border-t border-line pt-1">
        {data.map((point, index) => {
          if (data.length <= 8 || index % labelEvery === 0 || index === data.length - 1) {
            return (
              <span
                key={point.label + index}
                className="flex-1 truncate text-center text-[9px] leading-3 text-ink-faint"
              >
                {point.label}
              </span>
            );
          }
          return <span key={point.label + index} className="flex-1" />;
        })}
      </div>
    </div>
  );
}

/**
 * Horizontal bar breakdown — used for category, payment-method and supplier
 * splits. Dense rows: label, proportional bar, formatted value.
 */
export function HBarList({
  data,
  formatValue,
  className,
  limit = 8,
}: {
  data: { label: string; value: number }[];
  formatValue: (value: number) => string;
  className?: string;
  limit?: number;
}) {
  const rows = data.slice(0, limit);
  if (rows.length === 0) {
    return <EmptyChart note="Nothing to show for this period yet." />;
  }
  const max = Math.max(...rows.map((row) => row.value), 1);

  return (
    <ul className={cn("space-y-2", className)}>
      {rows.map((row) => (
        <li key={row.label}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-[11px] font-medium text-ink" title={row.label}>
              {row.label}
            </span>
            <span className="whitespace-nowrap text-[11px] font-semibold tabular-nums text-ink-soft">
              {formatValue(row.value)}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line/50">
            <div
              className="h-full rounded-full bg-navy"
              style={{ width: `${Math.max((row.value / max) * 100, row.value > 0 ? 3 : 0)}%` }}
              title={`${row.label}: ${formatValue(row.value)}`}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Donut-style share breakdown built from stacked CSS conic-gradient segments.
 */
export function ShareDonut({
  data,
  formatValue,
  colors = [DEFAULT_BAR, GOLD_BAR, "#667085", "#8a6e16", "#98a2b3", "#d7e0ea"],
  size = 96,
}: {
  data: { label: string; value: number }[];
  formatValue: (value: number) => string;
  colors?: string[];
  size?: number;
}) {
  if (data.length === 0) {
    return <EmptyChart note="Nothing to show for this period yet." />;
  }
  const total = Math.max(
    data.reduce((sum, row) => sum + row.value, 0),
    1,
  );

  const segments = data.map((row, index) => ({
    ...row,
    start: data.slice(0, index).reduce((sum, previous) => sum + previous.value, 0),
    color: colors[index % colors.length],
  }));

  const gradient = segments
    .map((segment) => {
      const from = (segment.start / total) * 360;
      const to = ((segment.start + segment.value) / total) * 360;
      return `${segment.color} ${from}deg ${to}deg`;
    })
    .join(", ");

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative shrink-0 rounded-full"
        style={{
          width: size,
          height: size,
          background: `conic-gradient(${gradient})`,
        }}
        title={data.map((row) => `${row.label}: ${formatValue(row.value)}`).join("\n")}
      >
        <div className="absolute inset-[28%] rounded-full bg-white" />
      </div>
      <ul className="min-w-0 flex-1 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-sm"
                style={{ backgroundColor: segment.color }}
              />
              <span className="truncate text-[11px] text-ink">{segment.label}</span>
            </span>
            <span className="whitespace-nowrap text-[11px] font-semibold tabular-nums text-ink-soft">
              {formatValue(segment.value)}
              <span className="ml-1 text-[9px] font-normal text-ink-faint">
                {((segment.value / total) * 100).toFixed(0)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function EmptyChart({ note }: { note: string }) {
  return (
    <div className="flex h-24 items-center justify-center rounded-md border border-dashed border-line bg-line/20 px-4 text-center text-[11px] leading-5 text-ink-faint">
      {note}
    </div>
  );
}