import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type InputProps = ComponentProps<"input"> & {
  compact?: boolean;
};

export function Input({ compact, className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-erp-border bg-white px-3 text-sm text-erp-text placeholder:text-erp-text-muted focus:border-erp-navy focus:outline-2 focus:outline-offset-0 focus:outline-erp-navy/25 disabled:cursor-not-allowed disabled:bg-erp-canvas disabled:text-erp-text-muted",
        compact ? "h-8 text-xs" : "h-10",
        className,
      )}
      {...props}
    />
  );
}