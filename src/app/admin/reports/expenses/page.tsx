import type { Metadata } from "next";
import Link from "next/link";
import { AdminCardSection, AdminEmptyState, AdminTable, PageHeader, Pagination, SearchForm, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { DateRangePicker } from "@/components/admin/dashboard/date-range-picker";
import { BarChart, HBarList } from "@/components/admin/dashboard/charts";
import { Panel, PanelGrid } from "@/components/admin/dashboard/section";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatCompactGHS, formatNumber, resolveDashboardRange, methodLabel } from "@/lib/admin/dashboard";
import { getExpenseReport } from "@/lib/admin/report-expenses";
import { getExpenseCategories } from "@/lib/admin/expenses";
import { formatDateLabel, monthKey, monthLabel } from "@/lib/admin/reporting";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Expense Reports — Yemanuel Store Admin",
};

export default async function AdminExpenseReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; q?: string; categoryId?: string; page?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }
  if (!hasPermission(session, PERMISSIONS.expenses.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the expenses.read permission required for this report." />
    );
  }

  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;

  const [data, categories] = await Promise.all([
    getExpenseReport(range, {
      q: params.q,
      categoryId: params.categoryId,
      page,
      pageSize,
    }),
    getExpenseCategories(),
  ]);

  const total = data.total;
  const topCategory = data.byCategory?.[0] ?? null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Expense Reports"
        description={`Operating expenses for ${range.label} · all figures in GH₵`}
        actions={<DateRangePicker current={range.key} customFrom={range.customFrom} customTo={range.customTo} />}
      />

      {!data.available && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs leading-5 text-danger">
          <strong>Aggregations are not available yet.</strong> This report reads
          pre-aggregated figures from SQL functions in the{" "}
          <code className="mx-1 rounded bg-white/60 px-1">app</code> schema
          (migration{" "}
          <code className="mx-1 rounded bg-white/60 px-1">
            20260817040000_dashboard_aggregations.sql
          </code>
          ). Apply the migration to unlock the summary panels. The expense list
          below still works.
        </div>
      )}

      {total && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Total expenses" value={formatGHS(total.total)} tone={total.total > 0 ? "danger" : "default"} />
            <KpiCard label="Expenses" value={formatNumber(total.expense_count)} />
            <KpiCard
              label="Average per expense"
              value={formatGHS(total.expense_count > 0 ? total.total / total.expense_count : 0)}
            />
            <KpiCard
              label="Top category"
              value={topCategory?.category_name ?? "—"}
              note={topCategory ? `${formatGHS(topCategory.total)} (${topCategory.expense_count} expenses)` : undefined}
            />
          </div>

          <PanelGrid>
            <Panel title="Expenses by month">
              <BarChart
                data={(data.byMonth ?? []).map((point) => ({
                  label: monthLabel(monthKey(point.month)),
                  value: point.total,
                }))}
                formatValue={formatCompactGHS}
                color="#0b1f33"
              />
            </Panel>
            <Panel title="Expenses by category">
              <HBarList
                data={(data.byCategory ?? []).map((point) => ({
                  label: point.category_name,
                  value: point.total,
                }))}
                formatValue={formatCompactGHS}
              />
            </Panel>
          </PanelGrid>

          <AdminCardSection title="Category summary">
            <AdminTable
              head={
                <>
                  <Th>Category</Th>
                  <Th className="text-right">Expenses</Th>
                  <Th className="text-right">Total</Th>
                  <Th className="text-right">Share</Th>
                </>
              }
            >
              {(data.byCategory ?? []).map((row) => (
                <tr key={row.category_name} className="transition-colors hover:bg-navy-soft/40">
                  <Td className="font-medium">{row.category_name}</Td>
                  <Td className="text-right text-ink-soft">{row.expense_count}</Td>
                  <Td className="whitespace-nowrap text-right font-medium">
                    {formatGHS(row.total)}
                  </Td>
                  <Td className="text-right text-ink-soft">
                    {total.total > 0 ? `${((row.total / total.total) * 100).toFixed(1)}%` : "—"}
                  </Td>
                </tr>
              ))}
            </AdminTable>
          </AdminCardSection>
        </>
      )}

      <AdminCardSection
        title="Expenses"
        headerExtra={
          <SearchForm
            placeholder="Search description…"
            initialValue={params.q ?? ""}
            extraFields={
              <select
                name="categoryId"
                defaultValue={params.categoryId ?? ""}
                className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink focus:border-navy focus:outline-none"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            }
          />
        }
      >
        {data.rows.length === 0 ? (
          <AdminEmptyState
            title="No expenses"
            message="Expenses in this range will appear here."
          />
        ) : (
          <>
            <AdminTable
              head={
                <>
                  <Th>Expense</Th>
                  <Th>Date</Th>
                  <Th>Category</Th>
                  <Th>Description</Th>
                  <Th>Method</Th>
                  <Th className="text-right">Amount</Th>
                </>
              }
            >
              {data.rows.map((row) => (
                <tr key={row.id} className="transition-colors hover:bg-navy-soft/40">
                  <Td>
                    <Link
                      href={`/admin/expenses/${row.id}`}
                      className="font-medium text-navy hover:underline"
                    >
                      {row.expenseNumber}
                    </Link>
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {formatDateLabel(row.expenseDate)}
                  </Td>
                  <Td className="text-ink-soft">{row.categoryName}</Td>
                  <Td className="max-w-64 truncate text-ink-soft">
                    {row.description}
                  </Td>
                  <Td className="text-ink-soft">{methodLabel(row.method)}</Td>
                  <Td className="whitespace-nowrap text-right font-medium">
                    {formatGHS(row.amount)}
                  </Td>
                </tr>
              ))}
            </AdminTable>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={data.rowsTotal}
              basePath="/admin/reports/expenses"
              searchParams={(() => {
                const listParams = new URLSearchParams();
                listParams.set("range", range.key);
                if (range.customFrom) listParams.set("from", range.customFrom);
                if (range.customTo) listParams.set("to", range.customTo);
                if (params.q) listParams.set("q", params.q);
                if (params.categoryId) listParams.set("categoryId", params.categoryId);
                return listParams;
              })()}
            />
          </>
        )}
      </AdminCardSection>
    </div>
  );
}