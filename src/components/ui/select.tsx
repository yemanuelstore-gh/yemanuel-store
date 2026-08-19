import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icons";

export type SelectProps = ComponentProps<"select"> & {
  compact?: boolean;
};

export function Select({ compact, className, children, ...props }: SelectProps) {
  return (
    <div className={cn("relative inline-flex w-full", compact && "w-auto")}>
      <select
        className={cn(
          "w-full appearance-none rounded-md border border-erp-border bg-white pl-3 pr-8 text-sm text-erp-text placeholder:text-erp-text-muted focus:border-erp-navy focus:outline-2 focus:outline-offset-0 focus:outline-erp-navy/25 disabled:cursor-not-allowed disabled:bg-erp-canvas disabled:text-erp-text-muted",
          compact ? "h-8 text-xs" : "h-10",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        size={14}
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-erp-text-muted"
      />
    </div>
  );
}