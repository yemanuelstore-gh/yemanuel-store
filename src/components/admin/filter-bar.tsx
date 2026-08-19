import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type FilterBarProps = ComponentProps<"div"> & {
  leading?: ReactNode;
  children?: ReactNode;
};

export function FilterBar({
  leading,
  children,
  className,
  ...props
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-md border border-erp-border bg-white px-3 py-2.5",
        className,
      )}
      {...props}
    >
      {leading && <div className="flex items-center gap-2">{leading}</div>}
      {children}
    </div>
  );
}