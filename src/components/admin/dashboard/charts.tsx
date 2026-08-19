import { cn } from "@/lib/cn";

/**
 * Premium, dependency-free charts — pure SVG/CSS in the store's palette
 * (midnight, navy, gold). No chart library is needed for the ERP's compact
 * bars and breakdowns, keeping the admin bundle small and server-rendered.
 */

export type ChartPoint = { label: string; value: number };

const DEFAULT_BAR = "#0b1f33";

const DONUT_PALETTE = ["#0b1f33", "#c9a227", "#15243e", "#dcb94e", "#3d5a80", "#8a6e16", "#6c7a94", "#56637a"];

function EmptyChart({ note }: { note: string }) {
  return (
    <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-lg border border-dashed border-line bg-navy-soft/10 px-4 text-center">
      <span className="text-lg leading-none" aria-hidden="true">
        ✦
      </span>
      <p className="mt-2 text-[11px] font-medium text-ink-faint">{note}</p>
    </div>
  );
}

/**
 * Vertical bar chart. Proportionally sized bars with rounded tops, a subtle
 * gradient fill and a baseline axis. Value labels render when the series is
 * short or `valueLabels` is set.
 */
export function BarChart({
  data,
  formatValue,
  height = 120,
  color = DEFAULT_BAR,
  className,
  valueLabels = false,
  gradient = true,
}: {
  data: ChartPoint[];
  formatValue: (value: number) => string;
  height?: number;
  color?: string;
  className?: string;
  valueLabels?: boolean;
  gradient?: boolean;
}) {
  if (data.length === 0) {
    return <EmptyChart note="No data for this period yet." />;
  }

  const max = Math.max(...data.map((point) => point.value), 1);
  const showLabels = valueLabels || data.length <= 12;
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <div className={className}>
      <div
        className="flex items-end gap-px rounded-lg bg-navy-soft/20 p-2"
        style={{ height }}
        aria-hidden="false"
      >
        {data.map((point, index) => {
          const heightPct = point.value > 0 ? Math.max((point.value / max) * 100, 2) : 1;
          return (
            <div
              key={point.label + index}
              className="group relative flex h-full flex-1 flex-col justify-end"
              style={{ height: "100%" }}
            >
              {showLabels && point.value > 0 && (
                <span className="mb-1 hidden truncate text-center text-[9px] font-semibold leading-3 text-ink-faint sm:block">
                  {formatValue(point.value)}
                </span>
              )}
              <div
                className="w-full rounded-t-[3px] shadow-[0_1px_2px_rgba(10,22,38,0.15)] transition-all duration-200 group-hover:opacity-90"
                style={{
                  height: `${heightPct}%`,
                  background: gradient
                    ? `linear-gradient(to top, color-mix(in srgb, ${color} 82%, black), ${color})`
                    : point.value > 0
                      ? color
                      : "rgba(15, 23, 42, 0.08)",
                  minHeight: point.value > 0 ? 3 : 2,
                  animationDelay: `${index * 24}ms`,
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
                className="flex-1 truncate text-center text-[9px] font-medium leading-3 text-ink-faint"
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
 * Horizontal bar breakdown — category, payment-method and supplier splits.
 * Dense rows: label, proportional gradient bar, formatted value.
 */
export function HBarList({
  data,
  formatValue,
  className,
  limit = 8,
}: {
  data: ChartPoint[];
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
    <ul className={cn("space-y-3", className)}>
      {rows.map((row, index) => (
        <li key={row.label} className="group">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-[11px] font-semibold text-ink">
              <span className="mr-1.5 text-[9px] font-bold text-ink-faint">
                {String(index + 1).padStart(2, "0")}
              </span>
              {row.label}
            </span>
            <span className="shrink-0 text-[11px] font-bold tabular-nums text-navy">
              {formatValue(row.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-navy-soft/50">
            <div
              className="h-full rounded-full transition-all duration-500 group-hover:opacity-90"
              style={{
                width: `${Math.max((row.value / max) * 100, 2)}%`,
                background: `linear-gradient(90deg, #0b1f33, color-mix(in srgb, #0b1f33 60%, #c9a227))`,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Donut share chart. SVG segments around a center total, with a legend
 * showing each segment's value and share.
 */
export function ShareDonut({
  data,
  formatValue,
  className,
}: {
  data: ChartPoint[];
  formatValue: (value: number) => string;
  className?: string;
}) {
  const segments = data.slice(0, 8);
  if (segments.length === 0) {
    return <EmptyChart note="Nothing to show for this period yet." />;
  }

  const total = segments.reduce((sum, point) => sum + Math.max(point.value, 0), 0);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;

  const arcs = segments
    .reduce<{
      arcs: (ChartPoint & { share: number; dash: number; offset: number })[];
      offset: number;
    }>(
      (acc, point) => {
        const share = total > 0 ? Math.max(point.value, 0) / total : 0;
        return {
          arcs: [
            ...acc.arcs,
            {
              ...point,
              share,
              dash: share * circumference,
              offset: acc.offset * circumference,
            },
          ],
          offset: acc.offset + share,
        };
      },
      { arcs: [], offset: 0 },
    )
    .arcs;

  return (
    <div className={cn("flex flex-col gap-5 sm:flex-row sm:items-center", className)}>
      <div className="relative mx-auto h-[150px] w-[150px] shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label="Share breakdown">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#eef1f7" strokeWidth="13" />
          {arcs.map((arc, index) => (
            <circle
              key={arc.label + index}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={DONUT_PALETTE[index % DONUT_PALETTE.length]}
              strokeWidth="13"
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
              className="transition-opacity duration-200 hover:opacity-85"
            >
              <title>{`${arc.label}: ${formatValue(arc.value)} (${(arc.share * 100).toFixed(1)}%)`}</title>
            </circle>
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[9px] font-bold uppercase tracking-widest text-ink-faint">Total</span>
          <span className="text-sm font-bold tabular-nums text-midnight">{formatCompact(total)}</span>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-1.5">
        {arcs.map((arc, index) => (
          <li key={arc.label + index} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: DONUT_PALETTE[index % DONUT_PALETTE.length] }}
              />
              <span className="truncate text-[11px] font-medium text-ink">{arc.label}</span>
            </span>
            <span className="shrink-0 text-[11px] font-bold tabular-nums text-ink-soft">
              {formatValue(arc.value)}
              <span className="ml-1.5 text-[9px] font-semibold text-ink-faint">
                {(arc.share * 100).toFixed(1)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GHS",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}