import { formatGHS } from "@/lib/format";
import { formatCompactGHS } from "@/lib/admin/dashboard";
import { TrendBars } from "@/components/admin/dashboard/trend-bars";
import type {
  ExpenseCategoryRow,
  ExpenseMonthPoint,
  ExpenseSnapshot,
} from "@/lib/admin/dashboard";

function monthShort(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
  });
}

export function ExpenseAnalytics({
  snapshot,
  byCategory,
  byMonth,
}: {
  snapshot: ExpenseSnapshot | null;
  byCategory: ExpenseCategoryRow[] | null;
  byMonth: ExpenseMonthPoint[] | null;
}) {
  if (snapshot === null) {
    return (
      <p className="py-3 text-xs text-erp-text-muted">
        Expense data is unavailable with your current permissions.
      </p>
    );
  }

  const stats = [
    {
      label: "Today",
      value: formatGHS(snapshot.today_total),
      footnote: `${snapshot.today_count} entr${snapshot.today_count === 1 ? "y" : "ies"}`,
    },
    {
      label: "This month",
      value: formatGHS(snapshot.month_total),
      footnote: `${snapshot.month_count} entr${snapshot.month_count === 1 ? "y" : "ies"}`,
    },
    {
      label: "This year",
      value: formatCompactGHS(snapshot.year_total),
      footnote: `${snapshot.year_count} entr${snapshot.year_count === 1 ? "y" : "ies"}`,
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="min-w-0">
        <div className="grid grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-md border border-erp-border bg-erp-canvas/50 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
                {stat.label}
              </p>
              <p className="mt-1 text-base font-semibold tabular-nums text-erp-text">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[10px] text-erp-text-secondary">{stat.footnote}</p>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
          By category
        </p>
        {byCategory === null ? (
          <p className="py-2 text-xs text-erp-text-muted">Category data unavailable.</p>
        ) : byCategory.length === 0 ? (
          <p className="py-2 text-xs text-erp-text-muted">No expenses in this period.</p>
        ) : (
          <ul className="mt-1 space-y-2">
            {byCategory.map((row) => (
              <li key={row.category}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-xs font-medium text-erp-text">
                    {row.category}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-erp-text-secondary">
                    {formatGHS(row.total)}
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
          Monthly trend
        </p>
        <div className="mt-2 flex-1">
          <TrendBars
            points={(byMonth ?? []).map((point) => ({
              label: monthShort(point.month),
              value: point.total,
              display: formatGHS(point.total),
            }))}
            formatValue={formatGHS}
          />
        </div>
        <p className="mt-2 text-[11px] text-erp-text-muted">
          Expense totals per month, this calendar year.
        </p>
      </div>
    </div>
  );
}