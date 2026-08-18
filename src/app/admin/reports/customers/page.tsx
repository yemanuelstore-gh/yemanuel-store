import type { Metadata } from "next";
import Link from "next/link";
import { AdminCardSection, AdminEmptyState, AdminTable, PageHeader, Pagination, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { DateRangePicker } from "@/components/admin/dashboard/date-range-picker";
import { HBarList } from "@/components/admin/dashboard/charts";
import { Panel } from "@/components/admin/dashboard/section";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatCompactGHS, formatNumber, resolveDashboardRange } from "@/lib/admin/dashboard";
import { getCustomerReport } from "@/lib/admin/report-customers";
import { formatDateLabel } from "@/lib/admin/reporting";
import { formatGHS, formatGhanaPhone } from "@/lib/format";

export const metadata: Metadata = {
  title: "Customer Reports — Yemanuel Store Admin",
};

export default async function AdminCustomerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string; page?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }
  if (!hasPermission(session, PERMISSIONS.customers.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the customers.read permission required for this report." />
    );
  }
  if (!hasPermission(session, PERMISSIONS.sales.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the sales.read permission required for the order figures in this report." />
    );
  }

  const params = await searchParams;
  const range = resolveDashboardRange(params);
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = 25;
  const data = await getCustomerReport(range, page, pageSize);
  const summary = data.summary;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customer Reports"
        description={`Customer activity for ${range.label} · repeat customers have 2+ orders ever, not just in the range`}
        actions={<DateRangePicker current={range.key} customFrom={range.customFrom} customTo={range.customTo} />}
      />

      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard label="Total customers" value={formatNumber(summary.total_customers)} />
          <KpiCard label="New this month" value={formatNumber(summary.new_this_month)} note="Within the selected range" />
          <KpiCard label="New this year" value={formatNumber(summary.new_this_year)} note="Since 1 Jan of the current year" />
          <KpiCard label="Repeat customers" value={formatNumber(summary.repeat_customers)} note="2+ orders ever" />
          <KpiCard
            label="Orders per customer"
            value={formatNumber(summary.orders_per_customer)}
            note={`${summary.total_orders} total orders`}
          />
        </div>
      )}

      {!data.available && (
        <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-xs leading-5 text-danger">
          <strong>Aggregations are not available yet.</strong> Customer summary
          KPIs are read from SQL functions in the{" "}
          <code className="mx-1 rounded bg-white/60 px-1">app</code> schema
          (migration{" "}
          <code className="mx-1 rounded bg-white/60 px-1">
            20260817040000_dashboard_aggregations.sql
          </code>
          ). Apply the migration to unlock them. The customer table below still
          works.
        </div>
      )}

      <Panel title="Top customers by spending">
        <HBarList
          data={(data.topCustomers ?? []).map((row) => ({
            label: row.customer_name,
            value: row.spending,
          }))}
          formatValue={formatCompactGHS}
        />
      </Panel>

      <AdminCardSection title="Customers">
        {data.rows.length === 0 ? (
          <AdminEmptyState
            title="No customer activity"
            message="Customers with orders in this range will appear here."
          />
        ) : (
          <>
            <AdminTable
              head={
                <>
                  <Th>Customer</Th>
                  <Th>Code</Th>
                  <Th>Phone</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Spend</Th>
                  <Th className="text-right">Avg order</Th>
                  <Th>Last order</Th>
                </>
              }
            >
              {data.rows.map((row) => (
                <tr
                  key={row.customerId ?? "guest"}
                  className="transition-colors hover:bg-navy-soft/40"
                >
                  <Td>
                    {row.customerId ? (
                      <Link
                        href={`/admin/customers/${row.customerId}`}
                        className="font-medium text-ink hover:text-navy hover:underline"
                      >
                        {row.name}
                      </Link>
                    ) : (
                      <span className="font-medium text-ink">{row.name}</span>
                    )}
                  </Td>
                  <Td className="text-ink-soft">{row.code ?? "—"}</Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {row.phone ? formatGhanaPhone(row.phone) : "—"}
                  </Td>
                  <Td className="text-right text-ink-soft">{row.orderCount}</Td>
                  <Td className="whitespace-nowrap text-right font-medium">
                    {formatGHS(row.spend)}
                  </Td>
                  <Td className="whitespace-nowrap text-right text-ink-soft">
                    {formatGHS(row.averageOrderValue)}
                  </Td>
                  <Td className="whitespace-nowrap text-ink-soft">
                    {formatDateLabel(row.lastOrderAt)}
                  </Td>
                </tr>
              ))}
            </AdminTable>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={data.total}
              basePath="/admin/reports/customers"
              searchParams={
                new URLSearchParams(
                  range.key === "custom"
                    ? { range: "custom", from: range.customFrom ?? "", to: range.customTo ?? "" }
                    : { range: range.key },
                )
              }
            />
          </>
        )}
      </AdminCardSection>
    </div>
  );
}