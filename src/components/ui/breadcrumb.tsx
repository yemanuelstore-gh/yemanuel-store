import Link from "next/link";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/icons";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumb({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-xs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1">
              {index > 0 && (
                <Icon
                  name="chevron-right"
                  size={12}
                  className="text-erp-text-muted"
                />
              )}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-erp-text-secondary transition-colors hover:text-erp-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erp-navy"
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={isLast ? "page" : undefined}
                  className={cn(
                    isLast
                      ? "font-medium text-erp-text"
                      : "text-erp-text-secondary",
                  )}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}