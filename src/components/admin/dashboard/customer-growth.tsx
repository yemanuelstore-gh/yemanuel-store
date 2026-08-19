import { EmptyState } from "@/components/ui/empty-state";
import { TrendBars } from "@/components/admin/dashboard/trend-bars";
import type { CustomerGrowthMonth, CustomerStats } from "@/lib/admin/dashboard";

function monthLabel(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
  });
}

export function CustomerGrowth({
  growth,
  stats,
}: {
  growth: CustomerGrowthMonth[] | null;
  stats: CustomerStats | null;
}) {
  if (growth === null || stats === null) {
    return (
      <p className="py-3 text-xs text-erp-text-muted">
        Customer data is unavailable with your current permissions.
      </p>
    );
  }

  if (growth.length === 0) {
    return (
      <EmptyState
        icon="customers"
        title="No customer growth yet"
        description="New customers registered each month will appear here."
      />
    );
  }

  const last = growth[growth.length - 1];
  const newThisWindow = growth.reduce((sum, point) => sum + point.new_count, 0);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="min-w-0">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-md border border-erp-border bg-erp-canvas/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
              Total customers
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-erp-text">
              {stats.total_customers.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border border-erp-border bg-erp-canvas/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
              New in period
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-erp-text">
              {stats.new_in_range.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md border border-erp-border bg-erp-canvas/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
              Repeat buyers
            </p>
            <p className="mt-1 text-base font-semibold tabular-nums text-erp-text">
              {stats.repeat_customers.toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
            Growth summary
          </p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-center justify-between gap-2">
              <span className="text-erp-text-secondary">New in trailing window</span>
              <span className="font-medium tabular-nums text-erp-text">
                {newThisWindow.toLocaleString()}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-erp-text-secondary">Registered all time</span>
              <span className="font-medium tabular-nums text-erp-text">
                {last.cumulative.toLocaleString()}
              </span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="text-erp-text-secondary">Repeat purchase rate</span>
              <span className="font-medium tabular-nums text-erp-text">
                {stats.total_customers > 0
                  ? ((stats.repeat_customers / stats.total_customers) * 100).toFixed(1)
                  : "—"}
                %
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div className="flex min-w-0 flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
          New customers per month
        </p>
        <div className="mt-2 flex-1">
          <TrendBars
            points={growth.map((point) => ({
              label: monthLabel(point.month),
              value: point.new_count,
              display: `${point.new_count.toLocaleString()} new · ${point.cumulative.toLocaleString()} total`,
            }))}
          />
        </div>
        <p className="mt-2 text-[11px] text-erp-text-muted">
          Registrations in the trailing {growth.length} months.
        </p>
      </div>
    </div>
  );
}