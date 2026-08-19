import type { ReactNode } from "react";
import { Breadcrumb, type BreadcrumbItem } from "@/components/ui/breadcrumb";

export type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
  filters?: ReactNode;
};

export function PageHeader({
  title,
  description,
  breadcrumb,
  actions,
  filters,
}: PageHeaderProps) {
  return (
    <div className="mb-5">
      {breadcrumb && <Breadcrumb items={breadcrumb} className="mb-2.5" />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-tight text-erp-text">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-erp-text-secondary">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        )}
      </div>
      {filters && <div className="mt-4">{filters}</div>}
    </div>
  );
}