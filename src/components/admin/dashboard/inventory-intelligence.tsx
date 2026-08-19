import { formatGHS } from "@/lib/format";
import { formatCompactGHS } from "@/lib/admin/dashboard";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/admin/status-badge";
import { TrendBars } from "@/components/admin/dashboard/trend-bars";
import type {
  GoodsReceivedPoint,
  InventoryCategoryRow,
  InventorySummary,
  RecentStockMovementRow,
} from "@/lib/admin/dashboard";
import { humanize } from "@/lib/admin/labels";

const MOVEMENT_TYPE_LABELS: Record<string, string> = {
  purchase_receipt: "Received from purchase",
  sale: "Sold",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  adjustment: "Adjustment",
  initial_stock: "Initial stock",
  return_in: "Returned",
};

function monthShort(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
  });
}

export function InventoryIntelligence({
  inventory,
  byCategory,
  inflow,
  movements,
}: {
  inventory: InventorySummary | null;
  byCategory: InventoryCategoryRow[] | null;
  inflow: GoodsReceivedPoint[] | null;
  movements: RecentStockMovementRow[] | null;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="min-w-0">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
              Stock value
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-erp-text">
              {formatCompactGHS(inventory?.total_value ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
              Units on hand
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-erp-text">
              {(inventory?.total_units ?? 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
              SKUs tracked
            </p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums text-erp-text">
              {(inventory?.sku_count ?? 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
              At reorder level
            </p>
            <p
              className={
                (inventory?.low_stock_count ?? 0) > 0
                  ? "mt-0.5 text-lg font-semibold tabular-nums text-erp-warning"
                  : "mt-0.5 text-lg font-semibold tabular-nums text-erp-text"
              }
            >
              {(inventory?.low_stock_count ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
          Stock value by category
        </p>
        {byCategory === null ? (
          <p className="py-2 text-xs text-erp-text-muted">Category data unavailable.</p>
        ) : byCategory.length === 0 ? (
          <p className="py-2 text-xs text-erp-text-muted">No stock by category yet.</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {byCategory.map((row) => (
              <li key={row.category}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-erp-text">
                    {row.category}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-erp-text-secondary">
                    {formatCompactGHS(row.value)}
                    <span className="ml-1.5 text-erp-text-muted">{row.share.toFixed(1)}%</span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-erp-canvas">
                  <div
                    className="h-full rounded-full bg-erp-gold"
                    style={{ width: `${row.share}%` }}
                    aria-hidden="true"
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex min-w-0 flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
          Stock inflow this year
        </p>
        <div className="mt-2 flex-1">
          <TrendBars
            points={(inflow ?? []).map((point) => ({
              label: monthShort(point.month),
              value: point.value,
              display: formatCompactGHS(point.value),
            }))}
            formatValue={formatCompactGHS}
          />
        </div>
        <p className="mt-2 text-[11px] text-erp-text-muted">
          Value of goods received (received or completed receipts).
        </p>
      </div>

      <div className="lg:col-span-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
          Recent stock movements
        </p>
        {movements === null ? (
          <p className="py-2 text-xs text-erp-text-muted">Movement data unavailable.</p>
        ) : movements.length === 0 ? (
          <EmptyState
            icon="stock"
            title="No movements yet"
            description="Stock movements from sales, purchases, transfers and adjustments will appear here."
          />
        ) : (
          <ul className="mt-1 divide-y divide-erp-border">
            {movements.map((movement) => (
              <li
                key={`${movement.created_at}-${movement.product_name}-${movement.quantity_change}`}
                className="flex items-center justify-between gap-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <StatusBadge status={MOVEMENT_TYPE_LABELS[movement.movement_type] ?? humanize(movement.movement_type)} />
                  <span className="min-w-0 truncate text-xs font-medium text-erp-text">
                    {movement.product_name}
                    {movement.variant_name ? ` · ${movement.variant_name}` : ""}
                  </span>
                  {movement.sku && (
                    <span className="shrink-0 text-[10px] text-erp-text-muted">
                      {movement.sku}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-xs tabular-nums text-erp-text-secondary">
                  <span
                    className={
                      movement.quantity_change > 0
                        ? "font-medium text-erp-success"
                        : "font-medium text-erp-cancelled"
                    }
                  >
                    {movement.quantity_change > 0 ? "+" : ""}
                    {movement.quantity_change.toLocaleString()}
                  </span>
                  {movement.unit_cost != null && (
                    <span className="ml-2 text-erp-text-muted">
                      @ {formatGHS(movement.unit_cost)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}