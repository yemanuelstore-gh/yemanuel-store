"use client";

import { useState } from "react";
import Link from "next/link";
import { Tabs } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/admin/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatGHS } from "@/lib/format";
import type {
  RecentPaymentRow,
  RecentPurchaseOrderRow,
  RecentStockMovementRow,
} from "@/lib/admin/dashboard";
import { PAYMENT_METHOD_LABELS, PO_STATUS_LABELS, labelFor } from "@/lib/admin/labels";
import { cn } from "@/lib/cn";

type TabId = "payments" | "stock" | "purchases";

function formatWhen(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today ${time}`;
  return `${date.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} ${time}`;
}

function PaymentList({ rows }: { rows: RecentPaymentRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="payments"
        title="No payments yet"
        description="Payments recorded against orders will appear here."
      />
    );
  }
  return (
    <ul className="divide-y divide-erp-border">
      {rows.map((payment, index) => (
        <li
          key={`${payment.payment_date}-${payment.amount}-${index}`}
          className="flex items-center justify-between gap-3 py-2.5"
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="min-w-0">
              {payment.order_number ? (
                <span className="block truncate text-xs font-medium text-erp-navy">
                  {payment.order_number}
                </span>
              ) : (
                <span className="block truncate text-xs font-medium text-erp-text">
                  Walk-in payment
                </span>
              )}
              <span className="block truncate text-[10px] text-erp-text-muted">
                {payment.reference ?? labelFor(payment.method, PAYMENT_METHOD_LABELS)}
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <StatusBadge status={payment.status} dot={false} />
            <span className="text-xs font-medium tabular-nums text-erp-text">
              {formatGHS(payment.amount)}
            </span>
            <span className="w-24 text-right text-[10px] text-erp-text-muted">
              {formatWhen(payment.payment_date)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function StockList({ rows }: { rows: RecentStockMovementRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="stock"
        title="No stock movements yet"
        description="Stock movements will appear here as stock is sold, received or adjusted."
      />
    );
  }
  return (
    <ul className="divide-y divide-erp-border">
      {rows.map((movement, index) => (
        <li
          key={`${movement.created_at}-${movement.product_name}-${index}`}
          className="flex items-center justify-between gap-3 py-2.5"
        >
          <div className="min-w-0">
            <span className="block truncate text-xs font-medium text-erp-text">
              {movement.product_name}
              {movement.variant_name ? ` · ${movement.variant_name}` : ""}
            </span>
            <span className="block truncate text-[10px] text-erp-text-muted">
              {humanizeMovement(movement.movement_type)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                movement.quantity_change > 0 ? "text-erp-success" : "text-erp-cancelled",
              )}
            >
              {movement.quantity_change > 0 ? "+" : ""}
              {movement.quantity_change.toLocaleString()}
            </span>
            <span className="w-24 text-right text-[10px] text-erp-text-muted">
              {formatWhen(movement.created_at)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function PurchaseList({ rows }: { rows: RecentPurchaseOrderRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="purchase-orders"
        title="No purchase orders yet"
        description="Purchase orders raised with suppliers will appear here."
      />
    );
  }
  return (
    <ul className="divide-y divide-erp-border">
      {rows.map((po) => (
        <li
          key={po.po_number}
          className="flex items-center justify-between gap-3 py-2.5"
        >
          <div className="min-w-0">
            <Link
              href={`/admin/purchases/${po.po_number}`}
              className="block truncate text-xs font-medium text-erp-navy hover:underline"
            >
              {po.po_number}
            </Link>
            <span className="block truncate text-[10px] text-erp-text-muted">
              {po.supplier_name ?? "Unknown supplier"}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <StatusBadge status={labelFor(po.status, PO_STATUS_LABELS)} dot={false} />
            <span className="w-24 text-right text-[10px] text-erp-text-muted">
              {formatWhen(po.created_at)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function humanizeMovement(type: string): string {
  return labelFor(type, {
    purchase_receipt: "Received from purchase",
    sale: "Sold",
    transfer_in: "Transfer in",
    transfer_out: "Transfer out",
    adjustment: "Adjustment",
    initial_stock: "Initial stock",
    return_in: "Returned",
  });
}

export function RecentActivity({
  payments,
  movements,
  purchaseOrders,
}: {
  payments: RecentPaymentRow[] | null;
  movements: RecentStockMovementRow[] | null;
  purchaseOrders: RecentPurchaseOrderRow[] | null;
}) {
  const [tab, setTab] = useState<TabId>("payments");

  const tabs = [
    {
      id: "payments" as const,
      label: "Payments",
      badge: payments?.length ?? 0,
    },
    {
      id: "stock" as const,
      label: "Stock",
      badge: movements?.length ?? 0,
    },
    {
      id: "purchases" as const,
      label: "Purchases",
      badge: purchaseOrders?.length ?? 0,
    },
  ];

  return (
    <div>
      <Tabs
        items={tabs}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        className="mb-3"
      />
      {tab === "payments" &&
        (payments === null ? (
          <p className="py-3 text-xs text-erp-text-muted">
            Payment data unavailable with your current permissions.
          </p>
        ) : (
          <PaymentList rows={payments} />
        ))}
      {tab === "stock" &&
        (movements === null ? (
          <p className="py-3 text-xs text-erp-text-muted">
            Stock data unavailable with your current permissions.
          </p>
        ) : (
          <StockList rows={movements} />
        ))}
      {tab === "purchases" &&
        (purchaseOrders === null ? (
          <p className="py-3 text-xs text-erp-text-muted">
            Purchasing data unavailable with your current permissions.
          </p>
        ) : (
          <PurchaseList rows={purchaseOrders} />
        ))}
    </div>
  );
}