import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { KpiCard } from "@/components/admin/kpi-card";
import { createClient } from "@/lib/supabase/server";
import {
  resolveDashboardRange,
  getPaymentsRange,
  getExpensesRange,
  formatCompactGHS,
} from "@/lib/admin/dashboard";
import {
  listReceivables,
  listPayables,
  expenseBreakdownByCategory,
  paymentBreakdownByMethod,
} from "@/lib/admin/treasury";
import { listFinancialAccounts, summarizeAccounts } from "@/lib/admin/finance";
import { PAYMENT_METHOD_LABELS, labelFor } from "@/lib/admin/labels";
import { formatGHS } from "@/lib/format";

const RANGE_KEY = "month" as const;

export async function FinanceReport() {
  const client = await createClient();
  const range = resolveDashboardRange({ range: RANGE_KEY });
  const [payments, expenses, receivables, payables, categoryBreakdown, methodBreakdown, accounts] =
    await Promise.all([
      getPaymentsRange(client, range),
      getExpensesRange(client, range),
      listReceivables(client, { page: 1, pageSize: 1 }),
      listPayables(client, { page: 1, pageSize: 1 }),
      expenseBreakdownByCategory(client, range),
      paymentBreakdownByMethod(client, range),
      listFinancialAccounts(client).catch(() => null),
    ]);

  const collected = payments?.collected_total ?? 0;
  const expenseTotal = expenses?.total ?? 0;
  const accountSummary = accounts ? summarizeAccounts(accounts) : null;
  const accountBalance = accountSummary?.total_balance ?? null;

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Payments Collected" value={formatGHS(collected)} icon="payments" />
        <KpiCard label="Expenses" value={formatGHS(expenseTotal)} icon="expenses" />
        <KpiCard label="Net Position" value={formatGHS(collected - expenseTotal)} icon="reports" />
        <KpiCard
          label="Account Balances"
          value={accountBalance != null ? formatGHS(accountBalance) : "Unavailable"}
          icon="wallet"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-erp-border px-4 py-3">
            <h2 className="text-sm font-semibold text-erp-text">Expenses by Category</h2>
          </div>
          {categoryBreakdown.length === 0 ? (
            <p className="px-4 py-6 text-sm text-erp-text-secondary">
              No expenses recorded in {range.label.toLowerCase()}.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Category</TH>
                  <TH>Entries</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {categoryBreakdown.slice(0, 10).map((row) => (
                  <TR key={row.category}>
                    <TD className="max-w-56">
                      <span className="block truncate text-erp-text">{row.category}</span>
                    </TD>
                    <TD className="tabular-nums text-erp-text-secondary">{row.count}</TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {formatGHS(row.total)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-erp-border px-4 py-3">
            <h2 className="text-sm font-semibold text-erp-text">Payments by Method</h2>
          </div>
          {methodBreakdown.length === 0 ? (
            <p className="px-4 py-6 text-sm text-erp-text-secondary">
              No payments collected in {range.label.toLowerCase()}.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Method</TH>
                  <TH>Transactions</TH>
                  <TH className="text-right">Total</TH>
                </TR>
              </THead>
              <TBody>
                {methodBreakdown.slice(0, 10).map((row) => (
                  <TR key={row.method}>
                    <TD className="text-erp-text">
                      {labelFor(row.method, PAYMENT_METHOD_LABELS)}
                    </TD>
                    <TD className="tabular-nums text-erp-text-secondary">{row.count}</TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {formatGHS(row.total)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card padding="sm">
          <h2 className="text-sm font-semibold text-erp-text">Receivables</h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-erp-text">
            {formatCompactGHS(receivables.totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-erp-text-secondary">
            Outstanding across {receivables.total} customers
          </p>
        </Card>
        <Card padding="sm">
          <h2 className="text-sm font-semibold text-erp-text">Payables</h2>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-erp-text">
            {formatCompactGHS(payables.totalOutstanding)}
          </p>
          <p className="mt-1 text-xs text-erp-text-secondary">
            Outstanding across {payables.total} suppliers
          </p>
        </Card>
      </div>
    </>
  );
}