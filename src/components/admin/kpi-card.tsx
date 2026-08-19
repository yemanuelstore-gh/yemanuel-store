import { cn } from "@/lib/cn";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/skeleton";

export type KpiTrend = {
  value: number;
  label?: string;
};

export type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  icon?: IconName;
  trend?: KpiTrend;
  comparison?: string;
  loading?: boolean;
  className?: string;
};

export function KpiCard({
  label,
  value,
  icon,
  trend,
  comparison,
  loading,
  className,
}: KpiCardProps) {
  const positive = (trend?.value ?? 0) >= 0;

  return (
    <Card padding="sm" className={cn("min-w-0", className)}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
          {label}
        </p>
        {icon && (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-erp-border bg-erp-canvas text-erp-text-secondary">
            <Icon name={icon} size={14} />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton className="mt-2.5 h-7 w-28" />
      ) : (
        <p className="mt-1.5 text-2xl font-semibold tracking-tight text-erp-text">
          {value}
        </p>
      )}
      {(trend || comparison) && (
        <div className="mt-1.5 flex items-center gap-2 text-xs">
          {loading ? (
            <Skeleton className="h-3.5 w-20" />
          ) : (
            <>
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 font-medium",
                    positive ? "text-erp-success" : "text-erp-cancelled",
                  )}
                >
                  <Icon
                    name={positive ? "chevron-right" : "chevron-down"}
                    size={12}
                    className={cn(
                      "-rotate-90",
                      positive ? "-rotate-90" : "rotate-90",
                    )}
                  />
                  {Math.abs(trend.value).toFixed(1)}%
                </span>
              )}
              {(trend?.label ?? comparison) && (
                <span className="text-erp-text-muted">
                  vs {trend?.label ?? comparison}
                </span>
              )}
            </>
          )}
        </div>
      )}
    </Card>
  );
}