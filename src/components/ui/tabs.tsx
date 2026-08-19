"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: ReactNode;
  badge?: number;
  disabled?: boolean;
};

export type TabsProps = Omit<ComponentProps<"div">, "onChange"> & {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
};

export function Tabs({ items, value, onChange, className, ...props }: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1 border-b border-erp-border",
        className,
      )}
      {...props}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onChange(item.id)}
            className={cn(
              "relative -mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy disabled:cursor-not-allowed disabled:opacity-50",
              active
                ? "border-erp-gold text-erp-navy"
                : "border-transparent text-erp-text-muted hover:border-erp-border hover:text-erp-text-secondary",
            )}
          >
            {item.label}
            {typeof item.badge === "number" && item.badge > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                  active ? "bg-erp-gold-soft text-erp-gold-hover" : "bg-erp-canvas text-erp-text-muted",
                )}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}