import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "gold" | "secondary" | "ghost" | "danger";
export type ButtonSize = "xs" | "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-erp-navy text-white hover:bg-erp-navy-hover focus-visible:outline-erp-navy",
  gold: "bg-erp-gold text-erp-navy-deep hover:bg-erp-gold-hover focus-visible:outline-erp-gold",
  secondary:
    "border border-erp-border bg-white text-erp-text hover:bg-erp-canvas hover:border-erp-text-muted focus-visible:outline-erp-navy",
  ghost:
    "text-erp-text-secondary hover:bg-erp-canvas hover:text-erp-navy focus-visible:outline-erp-navy",
  danger:
    "bg-erp-cancelled text-white hover:bg-erp-cancelled/90 focus-visible:outline-erp-cancelled",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-7 px-2.5 text-[11px]",
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
};

export type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}