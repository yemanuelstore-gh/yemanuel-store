import { formatGHS } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import type { CollectionMethodRow } from "@/lib/admin/dashboard";
import { PAYMENT_METHOD_LABELS, labelFor } from "@/lib/admin/labels";

export function CollectionBreakdown({
  collections,
}: {
  collections: CollectionMethodRow[] | null;
}) {
  if (collections === null) {
    return (
      <p className="py-3 text-xs text-erp-text-muted">
        Payment data is unavailable with your current permissions.
      </p>
    );
  }

  if (collections.length === 0) {
    return (
      <EmptyState
        icon="payments"
        title="No collections yet"
        description="Payments collected in this period will appear here by method."
      />
    );
  }

  const total = collections.reduce((sum, row) => sum + row.amount, 0);

  return (
    <div className="space-y-3">
      {collections.map((row) => (
        <div key={row.method}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[13px] font-medium text-erp-text">
              {labelFor(row.method, PAYMENT_METHOD_LABELS)}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-erp-text-secondary">
              {formatGHS(row.amount)}
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
          <p className="mt-0.5 text-[10px] text-erp-text-muted">
            {row.count} payment{row.count === 1 ? "" : "s"}
          </p>
        </div>
      ))}
      <p className="pt-1 text-[11px] text-erp-text-muted">
        {formatGHS(total)} collected across {collections.length}{" "}
        {collections.length === 1 ? "method" : "methods"}
      </p>
    </div>
  );
}