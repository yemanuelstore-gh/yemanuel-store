import { formatGHS } from "@/lib/format";
import { formatCompactGHS } from "@/lib/admin/dashboard";
import { TrendBars } from "@/components/admin/dashboard/trend-bars";
import type { GoodsReceivedPoint, PurchasingOverview } from "@/lib/admin/dashboard";

function monthShort(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthIndex - 1, 1)).toLocaleDateString("en-GB", {
    month: "short",
  });
}

export function PurchasingOverviewSection({
  overview,
  inflow,
}: {
  overview: PurchasingOverview | null;
  inflow: GoodsReceivedPoint[] | null;
}) {
  if (overview === null) {
    return (
      <p className="py-3 text-xs text-erp-text-muted">
        Purchasing data is unavailable with your current permissions.
      </p>
    );
  }

  const stats = [
    {
      label: "Goods received this month",
      value: formatGHS(overview.month_value),
      footnote: `${overview.month_receipt_count} receipt${
        overview.month_receipt_count === 1 ? "" : "s"
      } · ${overview.month_units.toLocaleString()} units`,
    },
    {
      label: "Goods received this year",
      value: formatCompactGHS(overview.year_value),
      footnote: `${overview.year_receipt_count} receipt${
        overview.year_receipt_count === 1 ? "" : "s"
      }`,
    },
    {
      label: "Open purchase orders",
      value: formatCompactGHS(overview.open_po_value),
      footnote: `${overview.open_po_count} order${
        overview.open_po_count === 1 ? "" : "s"
      } awaiting goods`,
    },
    {
      label: "Outstanding to suppliers",
      value: formatCompactGHS(overview.outstanding_total),
      footnote: `${overview.outstanding_invoices} unpaid invoice${
        overview.outstanding_invoices === 1 ? "" : "s"
      }`,
    },
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div>
        <div className="grid grid-cols-2 gap-3">
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
        <p className="mt-3 text-[11px] text-erp-text-muted">
          Receipt values are the actual unit costs recorded on goods receipts.
        </p>
      </div>

      <div className="flex min-w-0 flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
          Purchasing inflow trend
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
          Monthly value of goods received, this calendar year.
        </p>
      </div>
    </div>
  );
}