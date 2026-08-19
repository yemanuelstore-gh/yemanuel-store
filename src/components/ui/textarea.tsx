import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type TextareaProps = ComponentProps<"textarea">;

export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full rounded-md border border-erp-border bg-white px-3 py-2 text-sm text-erp-text placeholder:text-erp-text-muted focus:border-erp-navy focus:outline-2 focus:outline-offset-0 focus:outline-erp-navy/25 disabled:cursor-not-allowed disabled:bg-erp-canvas disabled:text-erp-text-muted",
        className,
      )}
      {...props}
    />
  );
}