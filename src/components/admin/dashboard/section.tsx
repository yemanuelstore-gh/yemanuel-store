import { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Dashboard panel — a consistent card frame with a header row. Used across
 * the dashboard and report pages.
 */
export function Panel({
  title,
  subtitle,
  icon,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_3px_rgba(10,22,38,0.06)]",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-line bg-gradient-to-r from-navy-soft/40 to-transparent px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy text-gold-bright">
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-[13px] font-bold tracking-tight text-ink">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-[11px] text-ink-faint">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </header>
      <div className="flex-1 p-5">{children}</div>
    </section>
  );
}

export function PanelGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-5 lg:grid-cols-2", className)}>{children}</div>;
}