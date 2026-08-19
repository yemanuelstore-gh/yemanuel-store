import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icons";
import { formatGHS } from "@/lib/format";
import { MetricValue } from "@/components/admin/metric-value";
import type { ExpenseRangeData, OutstandingRow, PaymentRangeData } from "@/lib/admin/dashboard";

function OutstandingList({ rows }: { rows: OutstandingRow[] }) {
  if (rows.length === 0) {
    return <p className="py-3 text-xs text-erp-text-muted">Nothing outstanding.</p>;
  }
  return (
    <ul className="mt-2 divide-y divide-erp-border">
      {rows.map((row) => (
        <li key={row.name} className="flex items-center justify-between gap-2 py-2">
          <span className="min-w-0 truncate text-xs font-medium text-erp-text">
            {row.name}
          </span>
          <span className="shrink-0 text-xs font-medium tabular-nums text-erp-text">
            {formatGHS(row.outstanding)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function HealthCard({
  title,
  total,
  icon,
  footnote,
  children,
}: {
  title: string;
  total: number;
  icon: IconName;
  footnote: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="flex min-w-0 flex-col">
      <div className="flex items-center justify-between px-4 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-erp-text-secondary">
          {title}
        </p>
        <span className="flex size-7 items-center justify-center rounded-md border border-erp-border bg-erp-canvas text-erp-text-secondary">
          <Icon name={icon} size={14} />
        </span>
      </div>
      <div className="px-4 pt-2">
        <MetricValue size="lg" value={formatGHS(total)} />
        <p className="mt-0.5 text-[11px] text-erp-text-muted">{footnote}</p>
      </div>
      <div className="mt-2 px-4 pb-4">{children}</div>
    </Card>
  );
}

function PaymentBreakdown({ payments }: { payments: PaymentRangeData }) {
  const lines = [
    {
      label: "Collected",
      value: `${payments.collected_count.toLocaleString()} payment${
        payments.collected_count === 1 ? "" : "s"
      } · ${formatGHS(payments.collected_total)}`,
    },
    {
      label: "Pending",
      value: `${payments.pending_count.toLocaleString()} payment${
        payments.pending_count === 1 ? "" : "s"
      } · ${formatGHS(payments.pending_amount)}`,
    },
    {
      label: "Refunded",
      value: `${payments.refunds_count.toLocaleString()} refund${
        payments.refunds_count === 1 ? "" : "s"
      } · ${formatGHS(payments.refunds_total)}`,
    },
  ];
  return (
    <ul className="mt-2 space-y-1.5">
      {lines.map((line) => (
        <li
          key={line.label}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <span className="text-erp-text-secondary">{line.label}</span>
          <span className="tabular-nums text-erp-text">{line.value}</span>
        </li>
      ))}
    </ul>
  );
}

export function FinancialHealth({
  receivables,
  payables,
  expenses,
  payments,
}: {
  receivables: { rows: OutstandingRow[]; total: number } | null;
  payables: { rows: OutstandingRow[]; total: number } | null;
  expenses: ExpenseRangeData | null;
  payments: PaymentRangeData | null;
}) {
  const receivablesOrderCount = receivables?.rows.reduce((sum, row) => sum + row.order_count, 0) ?? 0;
  const payablesOrderCount = payables?.rows.reduce((sum, row) => sum + row.order_count, 0) ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <HealthCard
        title="Receivables"
        total={receivables?.total ?? 0}
        icon="receivables"
        footnote={
          receivables
            ? `${receivablesOrderCount.toLocaleString()} outstanding order${
                receivablesOrderCount === 1 ? "" : "s"
              }`
            : "Unavailable"
        }
      >
        <OutstandingList rows={receivables?.rows ?? []} />
      </HealthCard>

      <HealthCard
        title="Payables"
        total={payables?.total ?? 0}
        icon="payables"
        footnote={
          payables
            ? `${payablesOrderCount.toLocaleString()} unpaid invoice${
                payablesOrderCount === 1 ? "" : "s"
              }`
            : "Unavailable"
        }
      >
        <OutstandingList rows={payables?.rows ?? []} />
      </HealthCard>

      <HealthCard
        title="Expenses"
        total={expenses?.total ?? 0}
        icon="expenses"
        footnote={
          expenses
            ? `${expenses.expense_count.toLocaleString()} expense${
                expenses.expense_count === 1 ? "" : "s"
              } in this period`
            : "Unavailable"
        }
      >
        {expenses && expenses.expense_count > 0 ? (
          <div className="flex items-end gap-2">
            <MetricValue size="md" value={formatGHS(expenses.total)} />
            <span className="pb-0.5 text-[11px] text-erp-text-muted">
              {expenses.expense_count} entries
            </span>
          </div>
        ) : (
          <p className="py-3 text-xs text-erp-text-muted">No expenses recorded in this period.</p>
        )}
      </HealthCard>

      <HealthCard
        title="Payments"
        total={payments?.collected_total ?? 0}
        icon="payments"
        footnote={
          payments
            ? `in the selected period`
            : "Unavailable"
        }
      >
        {payments ? (
          <PaymentBreakdown payments={payments} />
        ) : (
          <p className="py-3 text-xs text-erp-text-muted">Payment data unavailable.</p>
        )}
      </HealthCard>
    </div>
  );
}

export { HealthCard };