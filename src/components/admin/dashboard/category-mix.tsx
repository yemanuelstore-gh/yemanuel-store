import { EmptyState } from "@/components/ui/empty-state";
import { formatGHS } from "@/lib/format";
import type { CategorySalesRow } from "@/lib/admin/dashboard";

export function CategoryMix({ rows }: { rows: CategorySalesRow[] }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon="products"
        title="No category sales yet"
        description="Revenue by product category in this period will appear here."
      />
    );
  }

  const total = rows.reduce((sum, row) => sum + row.revenue, 0);

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.category}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="min-w-0 truncate text-[13px] font-medium text-erp-text">
              {row.category}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-erp-text-secondary">
              {formatGHS(row.revenue)}
              <span className="ml-1.5 text-erp-text-muted">
                {row.share.toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-erp-canvas">
            <div
              className="h-full rounded-full bg-erp-gold"
              style={{ width: `${row.share}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      ))}
      <p className="pt-1 text-[11px] text-erp-text-muted">
        {rows.length} {rows.length === 1 ? "category" : "categories"} ·{" "}
        {formatGHS(total)} tracked sales
      </p>
    </div>
  );
}