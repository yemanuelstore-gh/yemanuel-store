import { formatGHS } from "@/lib/format";
import type { ExpenseRangeData, SalesRangeData } from "@/lib/admin/dashboard";
import { cn } from "@/lib/cn";

type BridgeLine = {
  label: string;
  value: number;
  kind: "revenue" | "cost" | "subtotal" | "net";
};

export function Profitability({
  sales,
  expenses,
}: {
  sales: SalesRangeData | null;
  expenses: ExpenseRangeData | null;
}) {
  if (sales === null || expenses === null) {
    return (
      <p className="py-3 text-xs text-erp-text-muted">
        Profitability data is unavailable with your current permissions.
      </p>
    );
  }

  const netProfit = sales.gross_profit - expenses.total;
  const lines: BridgeLine[] = [
    { label: "Revenue", value: sales.revenue, kind: "revenue" },
    { label: "Cost of goods sold", value: -sales.cogs, kind: "cost" },
    { label: "Gross profit", value: sales.gross_profit, kind: "subtotal" },
    { label: "Operating expenses", value: -expenses.total, kind: "cost" },
    { label: "Net profit", value: netProfit, kind: "net" },
  ];

  const maxAbs = Math.max(...lines.map((line) => Math.abs(line.value)), 1);
  const grossMargin = sales.revenue > 0 ? (sales.gross_profit / sales.revenue) * 100 : 0;
  const netMargin = sales.revenue > 0 ? (netProfit / sales.revenue) * 100 : 0;

  return (
    <div>
      <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
            Gross margin
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-erp-text">
            {grossMargin.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
            Net margin
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-erp-text">
            {netMargin.toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
            Expense ratio
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-erp-text">
            {sales.revenue > 0 ? ((expenses.total / sales.revenue) * 100).toFixed(1) : "—"}%
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-erp-text-muted">
            Gross profit
          </p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-erp-gold-hover">
            {formatGHS(sales.gross_profit)}
          </p>
        </div>
      </div>

      <ul className="divide-y divide-erp-border">
        {lines.map((line) => {
          const isNegative = line.value < 0;
          const width = Math.max((Math.abs(line.value) / maxAbs) * 100, 0);
          return (
            <li key={line.label} className="py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn(
                    "text-xs",
                    line.kind === "revenue" && "font-medium text-erp-text",
                    line.kind === "subtotal" && "font-medium text-erp-text",
                    line.kind === "net" && "font-semibold text-erp-navy",
                    line.kind === "cost" && "text-erp-text-secondary",
                  )}
                >
                  {line.label}
                </span>
                <span
                  className={cn(
                    "shrink-0 text-xs font-medium tabular-nums",
                    line.kind === "net"
                      ? isNegative
                        ? "text-erp-cancelled"
                        : "text-erp-success"
                      : isNegative
                        ? "text-erp-cancelled"
                        : "text-erp-text",
                  )}
                >
                  {isNegative ? "−" : ""}
                  {formatGHS(Math.abs(line.value))}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-erp-canvas">
                <div
                  className={cn(
                    "h-full rounded-full",
                    line.kind === "net"
                      ? isNegative
                        ? "bg-erp-cancelled"
                        : "bg-erp-navy"
                      : line.kind === "cost"
                        ? "bg-erp-text-muted"
                        : "bg-erp-gold",
                  )}
                  style={{ width: `${width}%` }}
                  aria-hidden="true"
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[11px] text-erp-text-muted">
        Bridge from revenue to net profit for {expenses.expense_count} expense
        entr{expenses.expense_count === 1 ? "y" : "ies"} in this period.
      </p>
    </div>
  );
}