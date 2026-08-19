import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type LoadingStateProps = ComponentProps<"div"> & {
  label?: ReactNode;
};

export function LoadingState({
  label = "Loading…",
  className,
  ...props
}: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2.5 px-4 py-10 text-xs text-erp-text-secondary",
        className,
      )}
      {...props}
    >
      <span className="size-3.5 animate-spin rounded-full border-2 border-erp-border border-t-erp-navy" />
      <span>{label}</span>
    </div>
  );
}