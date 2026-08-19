import { cn } from "@/lib/cn";

export type ErpStatusTone =
  | "neutral"
  | "success"
  | "pending"
  | "processing"
  | "cancelled"
  | "warning"
  | "info";

const toneClasses: Record<ErpStatusTone, { badge: string; dot: string }> = {
  neutral: { badge: "bg-erp-canvas text-erp-text-secondary", dot: "bg-erp-text-muted" },
  success: { badge: "bg-erp-success-soft text-erp-success", dot: "bg-erp-success" },
  pending: { badge: "bg-erp-pending-soft text-erp-pending", dot: "bg-erp-pending" },
  processing: { badge: "bg-erp-processing-soft text-erp-processing", dot: "bg-erp-processing" },
  cancelled: { badge: "bg-erp-cancelled-soft text-erp-cancelled", dot: "bg-erp-cancelled" },
  warning: { badge: "bg-erp-warning-soft text-erp-warning", dot: "bg-erp-warning" },
  info: { badge: "bg-erp-info-soft text-erp-info", dot: "bg-erp-info" },
};

const statusTone: Record<string, ErpStatusTone> = {
  paid: "success",
  completed: "success",
  delivered: "success",
  approved: "success",
  active: "success",
  pending: "pending",
  draft: "neutral",
  void: "neutral",
  processing: "processing",
  "in-transit": "processing",
  "in review": "processing",
  review: "processing",
  cancelled: "cancelled",
  rejected: "cancelled",
  refunded: "cancelled",
  failed: "cancelled",
  overdue: "warning",
  low: "warning",
  info: "info",
};

export function statusToneFor(status: string): ErpStatusTone {
  return statusTone[status.toLowerCase()] ?? "neutral";
}

export function StatusBadge({
  status,
  dot = true,
  className,
}: {
  status: string;
  dot?: boolean;
  className?: string;
}) {
  const tone = statusToneFor(status);
  const styles = toneClasses[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles.badge,
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", styles.dot)}
        />
      )}
      {status}
    </span>
  );
}