import { cn } from "@/lib/cn";

/**
 * Elegant navy/gold monogram for brands that do not yet carry a logo image.
 * Derives the initials from the brand name so every brand gets a consistent,
 * premium-looking mark without fabricating logo data.
 */
export function BrandMonogram({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden rounded-full border border-gold/40 bg-gradient-to-br from-navy via-navy-dark to-navy-dark",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-2 -top-3 h-8 w-8 rounded-full bg-gold/20 blur-xl"
      />
      <span className="relative font-display font-medium italic tracking-tight text-gold">
        {initials || "Y"}
      </span>
    </span>
  );
}