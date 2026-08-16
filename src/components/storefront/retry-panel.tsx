"use client";

import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type RetryPanelProps = {
  retryHref?: string;
  onRetry?: () => void;
  message?: string;
  className?: string;
};

export function RetryPanel({
  retryHref,
  onRetry,
  message,
  className,
}: RetryPanelProps) {
  const buttonClasses =
    "inline-flex h-8 items-center rounded-md bg-navy px-3 text-xs font-medium text-ivory transition-colors hover:bg-navy-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy";

  return (
    <Card className={cn("p-10 text-center lg:p-14", className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-navy-soft">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-6 w-6 text-navy"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
        </svg>
      </div>
      <h2 className="mt-5 font-display text-xl font-medium tracking-tight text-ink">
        The catalogue is temporarily unavailable
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-soft">
        {message ?? "We could not load the catalogue right now. Please try again shortly."}
      </p>
      <div className="mt-7">
        {retryHref ? (
          <Link href={retryHref} className={buttonClasses}>
            Try again
          </Link>
        ) : (
          <button type="button" onClick={onRetry} className={buttonClasses}>
            Try again
          </button>
        )}
      </div>
    </Card>
  );
}