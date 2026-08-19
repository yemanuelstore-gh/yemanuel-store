import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type CardProps = ComponentProps<"div"> & {
  padding?: "none" | "sm" | "md";
};

const paddingClasses = {
  none: "",
  sm: "p-3.5",
  md: "p-5",
};

export function Card({
  padding = "md",
  className,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-erp-border bg-erp-surface shadow-erp-card",
        paddingClasses[padding],
        className,
      )}
      {...props}
    />
  );
}