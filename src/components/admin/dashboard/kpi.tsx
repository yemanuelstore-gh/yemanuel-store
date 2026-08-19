import Link from "next/link";
import { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Premium KPI and hero cards for the admin dashboard. Compact ERP density
 * with the store's midnight/navy/gold palette, subtle gradients and gold
 * hairlines.
 */

type KpiTone = "default" | "danger" | "gold" | "positive";

const toneClasses: Record<KpiTone, string> = {
  default: "text-ink",
  danger: "text-danger",
  gold: "text-gold-dark",
  positive: "text-navy",
};

const cardFrame =
  "relative overflow-hidden rounded-xl border border-line bg-white p-4 shadow-[0_1px_3px_rgba(10,22,38,0.06)] transition-all hover:-translate-y-px hover:border-navy/25 hover:shadow-[0_6px_18px_rgba(10,22,38,0.10)]";

const goldHairline = (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/80 to-transparent"
  />
);

/**
 * Compact KPI card. Dense label, large value and a one-line note. Pass
 * `href` to turn the card into a link.
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
  value: ReactNode;
  note?: ReactNode;
  href?: string;
  tone?: KpiTone;
  className?: string;
}) {
  const body = (
    <>
      {goldHairline}
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{label}</p>
      <p
        className={cn(
          "mt-1.5 text-2xl font-bold tracking-tight tabular-nums",
          toneClasses[tone],
        )}
      >
        {value}
      </p>
      {note && <p className="mt-1 text-[11px] leading-4 text-ink-faint">{note}</p>}
    </>
  );

  if (!href) {
    return <div className={cn(cardFrame, className)}>{body}</div>;
  }

  return (
    <Link href={href} className={cn("block", cardFrame, className)}>
      {body}
    </Link>
  );
}

/**
 * Hero KPI card — deep midnight surface with a gold accent. Leads the
 * dashboard with the primary revenue figure.
 */
export function HeroCard({
  eyebrow,
  label,
  value,
  note,
  sparkline,
  subStats,
  href,
}: {
  eyebrow: string;
  label: string;
  value: ReactNode;
  note?: ReactNode;
  sparkline?: ReactNode;
  subStats?: { label: string; value: string }[];
  href?: string;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold-bright" />
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300">{eyebrow}</p>
      </div>
      <p className="mt-2.5 text-[11px] font-semibold text-slate-200">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums text-white">{value}</p>
      {note && <p className="mt-1.5 text-[11px] leading-4 text-slate-300">{note}</p>}
      {sparkline && <div className="mt-4">{sparkline}</div>}
      {subStats && subStats.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-3 xl:grid-cols-4">
          {subStats.map((stat) => (
            <div key={stat.label} className="bg-midnight-soft/60 px-3 py-2">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
                {stat.label}
              </p>
              <p className="mt-0.5 truncate text-[12px] font-semibold tabular-nums text-gold-bright">
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );

  const frame = cn(
    "relative overflow-hidden rounded-2xl bg-gradient-to-br from-midnight via-midnight to-midnight-deep p-5 ring-1 ring-inset ring-white/10 shadow-[0_10px_30px_rgba(6,15,29,0.35)]",
    "after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gold-bright/70 after:to-transparent",
  );

  if (!href) {
    return <div className={frame}>{body}</div>;
  }

  return (
    <Link href={href} className={cn("block transition-transform hover:-translate-y-px", frame)}>
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
        <div key={stat.label} className="rounded-lg border border-line bg-canvas/60 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
            {stat.label}
          </p>
          <p
            className={cn(
              "mt-0.5 text-[13px] font-semibold tracking-tight tabular-nums",
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

/**
 * Delta badge — ▲/▼ percent change against a previous period.
 */
export function DeltaBadge({
  current,
  previous,
  invert = false,
  onDark = false,
}: {
  current: number;
  previous: number;
  invert?: boolean;
  onDark?: boolean;
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
        "inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold",
        good
          ? onDark
            ? "bg-gold/15 text-gold-bright"
            : "bg-navy-soft text-navy"
          : onDark
            ? "bg-danger/20 text-red-300"
            : "bg-danger-soft text-danger",
      )}
    >
      {up ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
    </span>
  );
}