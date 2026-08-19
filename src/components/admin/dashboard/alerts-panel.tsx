import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import { formatGHS } from "@/lib/format";
import type { OperationsAlerts } from "@/lib/admin/dashboard";

export type AlertRow = {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  href: string;
  tone: "warning" | "danger" | "info" | "neutral";
};

const toneIcon = {
  warning: "text-erp-warning",
  danger: "text-erp-cancelled",
  info: "text-erp-info",
  neutral: "text-erp-text-secondary",
} as const;

export function AlertsPanel({
  alerts,
  lowStockCount,
  outOfStockCount,
}: {
  alerts: OperationsAlerts | null;
  lowStockCount: number | null;
  outOfStockCount: number | null;
}) {
  const rows: AlertRow[] = [
    {
      id: "low-stock",
      title: "Low stock",
      description:
        lowStockCount == null
          ? "Inventory data unavailable"
          : `${lowStockCount.toLocaleString()} product${lowStockCount === 1 ? "" : "s"} at or below reorder level`,
      icon: "stock",
      href: "/admin/stock",
      tone: lowStockCount && lowStockCount > 0 ? "warning" : "neutral",
    },
    {
      id: "out-of-stock",
      title: "Out of stock",
      description:
        outOfStockCount == null
          ? "Inventory data unavailable"
          : `${outOfStockCount.toLocaleString()} product${outOfStockCount === 1 ? "" : "s"} with no sellable stock`,
      icon: "adjustments",
      href: "/admin/stock",
      tone: outOfStockCount && outOfStockCount > 0 ? "danger" : "neutral",
    },
    {
      id: "pending-payments",
      title: "Pending payments",
      description:
        alerts == null
          ? "Payment data unavailable"
          : alerts.pending_payment_count > 0
            ? `${alerts.pending_payment_count.toLocaleString()} payment${
                alerts.pending_payment_count === 1 ? "" : "s"
              } awaiting confirmation · ${formatGHS(alerts.pending_payment_amount)}`
            : "No pending payments",
      icon: "payments",
      href: "/admin/payments",
      tone: alerts && alerts.pending_payment_count > 0 ? "warning" : "neutral",
    },
    {
      id: "open-pos",
      title: "Open purchase orders",
      description:
        alerts == null
          ? "Purchasing data unavailable"
          : `${alerts.open_po_count.toLocaleString()} purchase order${
              alerts.open_po_count === 1 ? "" : "s"
            } awaiting goods or approval`,
      icon: "purchase-orders",
      href: "/admin/purchases",
      tone: alerts && alerts.open_po_count > 0 ? "info" : "neutral",
    },
  ];

  return (
    <ul className="divide-y divide-erp-border">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={row.href}
            className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-erp-canvas/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-erp-navy"
          >
            <span className={`mt-0.5 shrink-0 ${toneIcon[row.tone]}`}>
              <Icon name={row.icon} size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-erp-text">
                {row.title}
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-erp-text-secondary">
                {row.description}
              </span>
            </span>
            <Icon
              name="chevron-right"
              size={14}
              className="mt-1 shrink-0 text-erp-text-muted transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}