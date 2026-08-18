import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Dashboard section wrapper — a white card with a compact uppercase header,
 * optional description and an optional "view all" action.
 */
export function DashboardSection({
  title,
  description,
  actionHref,
  actionLabel,
  children,
  className,
  bodyClassName,
}: {
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-lg border border-line bg-white", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line bg-canvas/50 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="h-3 w-0.5 shrink-0 rounded-full bg-gradient-to-b from-gold-bright to-gold-dark"
          />
          <div className="min-w-0">
            <h2 className="truncate text-[11px] font-bold uppercase tracking-wider text-ink">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 truncate text-[11px] text-ink-faint">{description}</p>
            )}
          </div>
        </div>
        {actionHref && actionLabel && (
          <Link
            href={actionHref}
            className="shrink-0 rounded-md border border-line-strong bg-white px-2 py-1 text-[11px] font-semibold text-navy transition-colors hover:border-navy/30 hover:bg-navy-soft/50 hover:text-navy-dark"
          >
            {actionLabel} →
          </Link>
        )}
      </div>
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Two-column card row used inside sections for paired panels.
 */
export function PanelGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid gap-4 xl:grid-cols-2", className)}>{children}</div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-md border border-line bg-white", className)}>
      <div className="flex items-center gap-1.5 border-b border-line bg-canvas/40 px-3 py-2">
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-gold" />
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">{title}</p>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}