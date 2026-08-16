import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export type CardProps = ComponentProps<"div">;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-line bg-white",
        className,
      )}
      {...props}
    />
  );
}