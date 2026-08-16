import Link from "next/link";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type ButtonLinkVariant = "primary" | "secondary" | "gold" | "white" | "outline-light";
type ButtonLinkSize = "sm" | "md";

const variantClasses: Record<ButtonLinkVariant, string> = {
  primary:
    "bg-navy text-white shadow-soft hover:bg-navy-dark focus-visible:outline-navy",
  secondary:
    "border border-line-strong bg-white text-ink shadow-soft hover:border-navy/40 hover:bg-navy-soft/60 focus-visible:outline-navy",
  gold:
    "bg-gold text-navy-dark shadow-soft hover:bg-gold-dark hover:text-ivory focus-visible:outline-gold",
  white:
    "bg-ivory text-navy shadow-soft hover:bg-white focus-visible:outline-ivory",
  "outline-light":
    "border border-ivory/35 bg-ivory/5 text-ivory backdrop-blur-sm hover:border-ivory/60 hover:bg-ivory/10 focus-visible:outline-ivory",
};

const sizeClasses: Record<ButtonLinkSize, string> = {
  sm: "h-8 px-3.5 text-xs",
  md: "h-11 px-5 text-sm",
};

export type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: ButtonLinkVariant;
  size?: ButtonLinkSize;
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium tracking-tight transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}