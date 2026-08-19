import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type LabelProps = ComponentProps<"label">;

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "mb-1.5 block text-xs font-medium text-erp-text-secondary",
        className,
      )}
      {...props}
    />
  );
}