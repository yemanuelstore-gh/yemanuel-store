import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";

export type ContentSectionProps = ComponentProps<"div"> & {
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
};

export function ContentSection({
  title,
  description,
  actions,
  children,
  className,
  ...props
}: ContentSectionProps) {
  return (
    <Card padding="none" className={cn("overflow-hidden", className)} {...props}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-erp-border px-4 py-3">
          <div>
            {title && (
              <h2 className="text-[15px] font-semibold text-erp-text">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-erp-text-secondary">
                {description}
              </p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </Card>
  );
}