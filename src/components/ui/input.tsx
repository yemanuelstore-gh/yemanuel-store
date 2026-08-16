import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type InputProps = ComponentProps<"input">;

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-md border border-line-strong bg-white px-3 text-sm text-ink placeholder:text-ink-faint focus:border-navy focus:outline-2 focus:outline-offset-0 focus:outline-navy/25 disabled:cursor-not-allowed disabled:bg-line/40 disabled:text-ink-faint",
        className,
      )}
      {...props}
    />
  );
}