import { formatGHS } from "@/lib/format";
import { formatCompactGHS } from "@/lib/admin/dashboard";
import type { BusinessLifetime } from "@/lib/admin/dashboard";

function dayLabel(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function monthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function BusinessLifetimeSection({
  lifetime,
}: {
  lifetime: BusinessLifetime | null;
}) {
  if (lifetime === null) {
    return (
      <p className="py-3 text-xs text-erp-text-muted">
        Lifetime summary is unavailable with your current permissions.
      </p>
    );
  }

  const highlights = [
    {
      label: "Best day",
      value: lifetime.best_day
        ? dayLabel(lifetime.best_day.day)
        : "—",
      footnote: lifetime.best_day ? formatGHS(lifetime.best_day.revenue) : "No sales yet",
    },
    {
      label: "Best month",
      value: lifetime.best_month ? monthLabel(lifetime.best_month.month) : "—",
      footnote: lifetime.best_month
        ? formatGHS(lifetime.best_month.revenue)
        : "No sales yet",
    },
    {
      label: "Top product",
      value: lifetime.top_product?.name ?? "—",
      footnote: lifetime.top_product
        ? formatGHS(lifetime.top_product.revenue)
        : "No sales yet",
    },
    {
      label: "Top category",
      value: lifetime.top_category?.category ?? "—",
      footnote: lifetime.top_category
        ? formatGHS(lifetime.top_category.revenue)
        : "No sales yet",
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-md border border-erp-border bg-erp-canvas/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
            Lifetime revenue
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-erp-gold-hover">
            {formatCompactGHS(lifetime.revenue)}
          </p>
        </div>
        <div className="rounded-md border border-erp-border bg-erp-canvas/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
            Orders placed
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-erp-text">
            {lifetime.orders.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border border-erp-border bg-erp-canvas/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
            Units sold
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-erp-text">
            {lifetime.units_sold.toLocaleString()}
          </p>
        </div>
        <div className="rounded-md border border-erp-border bg-erp-canvas/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
            Average order
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-erp-text">
            {lifetime.orders > 0 ? formatGHS(lifetime.revenue / lifetime.orders) : "—"}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {highlights.map((highlight) => (
          <div
            key={highlight.label}
            className="flex items-center justify-between gap-3 rounded-md border border-erp-border px-3 py-2"
          >
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
                {highlight.label}
              </span>
              <span className="mt-0.5 block truncate text-[13px] font-medium text-erp-text">
                {highlight.value}
              </span>
            </span>
            <span className="shrink-0 text-xs font-medium tabular-nums text-erp-text-secondary">
              {highlight.footnote}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[11px] text-erp-text-muted">
        Since the store opened — 17 January 2022.
      </p>
    </div>
  );
}