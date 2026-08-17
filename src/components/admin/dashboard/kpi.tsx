import Link from "next/link";
import { cn } from "@/lib/cn";

type KpiTone = "default" | "danger" | "gold" | "positive";

const toneClasses: Record<KpiTone, string> = {
  default: "text-ink",
  danger: "text-danger",
  gold: "text-gold-dark",
  positive: "text-navy",
};

/**
 * Compact ERP-style KPI card. Dense label, large value and a one-line note.
 */
export function KpiCard({
  label,
  value,
  note,
  href,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
  tone?: KpiTone;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-soft">
        {label}
      </p>
      <p className={cn("mt-1 text-lg font-semibold tracking-tight", toneClasses[tone])}>
        {value}
      </p>
      {note && <p className="mt-0.5 text-[10px] leading-4 text-ink-faint">{note}</p>}
    </>
  );

  if (!href) {
    return (
      <div className={cn("rounded-lg border border-line bg-white p-3", className)}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "block rounded-lg border border-line bg-white p-3 transition-colors hover:border-navy/30 hover:bg-navy-soft/30",
        className,
      )}
    >
      {body}
    </Link>
  );
}

export type StatItem = {
  label: string;
  value: string;
  tone?: KpiTone;
  note?: string;
};

/**
 * Dense inline stat strip for section headers — a row of small label/value
 * pairs used inside analytics sections.
 */
export function StatStrip({
  stats,
  columns = 5,
}: {
  stats: StatItem[];
  columns?: number;
}) {
  return (
    <div
      className="grid gap-x-4 gap-y-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {stats.map((stat) => (
        <div key={stat.label}>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            {stat.label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[13px] font-semibold tracking-tight",
              toneClasses[stat.tone ?? "default"],
            )}
          >
            {stat.value}
          </p>
          {stat.note && <p className="mt-0.5 text-[9px] leading-3 text-ink-faint">{stat.note}</p>}
        </div>
      ))}
    </div>
  );
}

export function DeltaBadge({
  current,
  previous,
  invert = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
}) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return null;
  }
  const delta = ((current - previous) / Math.abs(previous)) * 100;
  const up = delta >= 0;
  const good = invert ? !up : up;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1 py-0.5 text-[10px] font-semibold",
        good ? "bg-navy-soft text-navy" : "bg-danger-soft text-danger",
      )}
    >
      {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}