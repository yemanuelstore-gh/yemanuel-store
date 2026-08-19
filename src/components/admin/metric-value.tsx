import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type MetricValueProps = {
  value: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-[28px]",
};

export function MetricValue({
  value,
  size = "md",
  className,
}: MetricValueProps) {
  return (
    <span
      className={cn(
        "font-semibold tracking-tight text-erp-text tabular-nums",
        sizeClasses[size],
        className,
      )}
    >
      {value}
    </span>
  );
}