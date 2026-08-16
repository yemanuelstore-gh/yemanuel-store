import Image from "next/image";
import { isAllowedStoreImage } from "@/lib/image-config";
import { cn } from "@/lib/cn";

type ProductImageProps = {
  src: string | null | undefined;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /**
   * Monogram shown when no image is available yet. Defaults to "Y".
   */
  fallbackLetter?: string;
  /**
   * Caption shown under the monogram when no image is available yet.
   */
  fallbackLabel?: string;
};

function Fallback({
  alt,
  letter,
  label,
  className,
}: {
  alt: string;
  letter: string;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        "relative flex h-full w-full flex-col items-center justify-center gap-2.5 overflow-hidden bg-gradient-to-br from-navy via-navy-dark to-navy-dark",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(rgb(248 246 241 / 0.05) 1px, transparent 1px), linear-gradient(90deg, rgb(248 246 241 / 0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 -top-8 h-24 w-24 rounded-full bg-gold/15 blur-2xl"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-10 -right-6 h-28 w-28 rounded-full bg-gold/10 blur-2xl"
      />
      <span
        aria-hidden="true"
        className="relative font-display text-[clamp(2.5rem,6vw,4rem)] font-medium italic leading-none text-ivory/20"
      >
        {letter}
      </span>
      <span
        aria-hidden="true"
        className="relative rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] text-gold/80"
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Storefront image renderer for catalogue imagery served from Supabase
 * storage or from local `/images/...` assets. Handles the three real states:
 *  - a valid image source (remote allowlisted or same-origin path,
 *    rendered through next/image),
 *  - no image at all (elegant navy/gold monogram placeholder),
 *  - an invalid URL (same placeholder — never an img crash).
 */
export function ProductImage({
  src,
  alt,
  sizes,
  priority = false,
  className,
  fallbackLetter = "Y",
  fallbackLabel = "Image coming soon",
}: ProductImageProps) {
  if (!src || !isAllowedStoreImage(src)) {
    return (
      <Fallback
        alt={alt}
        letter={fallbackLetter}
        label={fallbackLabel}
        className={className}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}