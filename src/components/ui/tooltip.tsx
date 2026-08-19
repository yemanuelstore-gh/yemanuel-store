import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TooltipProps = {
  label: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  className?: string;
};

const sideClasses = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
};

export function Tooltip({
  label,
  children,
  side = "top",
  className,
}: TooltipProps) {
  return (
    <span className="group/tooltip relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-erp-navy-deep px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-erp-panel transition-opacity duration-100 group-hover/tooltip:opacity-100 group-focus-visible/tooltip:opacity-100",
          sideClasses[side],
          className,
        )}
      >
        {label}
      </span>
    </span>
  );
}