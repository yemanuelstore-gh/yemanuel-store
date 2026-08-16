import Link from "next/link";
import { cn } from "@/lib/cn";

type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  titleSize?: "lg" | "md";
  className?: string;
};

/**
 * Shared storefront section heading: gold eyebrow hairline + serif title,
 * optional supporting copy, and an optional "View all" action.
 */
export function SectionHeader({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel = "View all",
  titleSize = "lg",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className,
      )}
    >
      <div>
        <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-gold-dark">
          <span aria-hidden="true" className="h-px w-8 bg-gold" />
          {eyebrow}
        </p>
        <h2
          className={cn(
            "mt-2 font-display font-medium tracking-tight text-ink",
            titleSize === "lg" ? "text-2xl lg:text-3xl" : "text-xl",
          )}
        >
          {title}
        </h2>
        {description && (
          <p className="mt-1.5 max-w-md text-[13px] leading-5 text-ink-soft">
            {description}
          </p>
        )}
      </div>
      {actionHref && (
        <Link
          href={actionHref}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line-strong bg-white px-3.5 text-xs font-medium text-ink shadow-soft transition-all hover:border-navy/40 hover:text-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
        >
          {actionLabel}
          <span aria-hidden="true" className="text-gold-dark">→</span>
        </Link>
      )}
    </div>
  );
}