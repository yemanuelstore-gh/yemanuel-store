import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "@/components/ui/icons";

export type EmptyStateProps = ComponentProps<"div"> & {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({
  icon = "search",
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-erp-border bg-erp-canvas/40 px-6 py-12 text-center",
        className,
      )}
      {...props}
    >
      <div className="flex size-10 items-center justify-center rounded-full border border-erp-border bg-white text-erp-text-muted">
        <Icon name={icon} size={18} />
      </div>
      <p className="text-sm font-medium text-erp-text">{title}</p>
      {description && (
        <p className="max-w-sm text-xs leading-relaxed text-erp-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}