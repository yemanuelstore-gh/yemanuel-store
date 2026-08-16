import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "neutral" | "success" | "warning" | "danger" | "info";

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-line/50 text-ink-soft",
  success: "bg-navy-soft text-navy",
  warning: "bg-gold-soft text-gold-dark",
  danger: "bg-danger-soft text-danger",
  info: "bg-navy-mist text-navy-dark",
};

export type BadgeProps = ComponentProps<"span"> & {
  variant?: BadgeVariant;
};

export function Badge({
  variant = "neutral",
  className,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}