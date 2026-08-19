import type { Metadata } from "next";
import { PageContainer } from "@/components/admin/page-container";
import { PageHeader } from "@/components/admin/page-header";
import { Card } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { NoAccess } from "@/components/admin/no-access";
import { KpiCard } from "@/components/admin/kpi-card";
import { TopCustomersTable } from "@/components/admin/dashboard/top-customers";
import { getAdminSession, hasPermission } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import {
  resolveDashboardRange,
  getCustomerStats,
  getTopCustomers,
  getCustomerGrowth,
} from "@/lib/admin/dashboard";
import { formatGHS } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Customers Report — Yemanuel ERP",
};

const RANGE_KEY = "quarter" as const;

export default async function CustomersReportPage() {
  const session = await getAdminSession();
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return (
      <PageContainer>
        <PageHeader
          title="Customers Report"
          breadcrumb={[{ label: "Reports" }, { label: "Customers" }]}
        />
        <NoAccess module="customer reports" />
      </PageContainer>
    );
  }

  const client = await createClient();
  const range = resolveDashboardRange({ range: RANGE_KEY });
  const [stats, topCustomers, growth] = await Promise.all([
    getCustomerStats(client, range),
    getTopCustomers(client, range, 10),
    getCustomerGrowth(client, 12),
  ]);

  return (
    <PageContainer>
      <PageHeader
        title="Customers Report"
        description={`Customer base and top buyers for ${range.label.toLowerCase()}.`}
        breadcrumb={[{ label: "Reports" }, { label: "Customers" }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Customers"
          value={stats != null ? stats.total_customers.toLocaleString() : "—"}
          icon="customers"
        />
        <KpiCard
          label={`New This ${range.label.split(" ").pop() ?? "Period"}`}
          value={stats != null ? stats.new_in_range.toLocaleString() : "—"}
          icon="plus"
        />
        <KpiCard
          label="Repeat Customers"
          value={stats != null ? stats.repeat_customers.toLocaleString() : "—"}
          icon="user"
        />
        <KpiCard
          label="Monthly Growth (12m)"
          value={
            growth != null && growth.length > 0
              ? `${growth[growth.length - 1].new_count.toLocaleString()} new`
              : "—"
          }
          icon="reports"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-erp-border px-4 py-3">
            <h2 className="text-sm font-semibold text-erp-text">Top Customers</h2>
          </div>
          {!topCustomers || topCustomers.length === 0 ? (
            <p className="px-4 py-6 text-sm text-erp-text-secondary">
              No customer orders in this period.
            </p>
          ) : (
            <TopCustomersTable customers={topCustomers} />
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-erp-border px-4 py-3">
            <h2 className="text-sm font-semibold text-erp-text">
              New Customers per Month
            </h2>
          </div>
          {!growth || growth.length === 0 ? (
            <p className="px-4 py-6 text-sm text-erp-text-secondary">
              No customer growth data available.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Month</TH>
                  <TH className="text-right">New Customers</TH>
                  <TH className="text-right">Cumulative</TH>
                </TR>
              </THead>
              <TBody>
                {growth.slice(-12).map((row) => (
                  <TR key={row.month}>
                    <TD className="text-erp-text">{row.month}</TD>
                    <TD className="text-right tabular-nums text-erp-text-secondary">
                      {row.new_count.toLocaleString()}
                    </TD>
                    <TD className="text-right font-semibold tabular-nums text-erp-text">
                      {row.cumulative.toLocaleString()}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </Card>
      </div>

      {topCustomers != null && topCustomers.length > 0 && (
        <Card padding="sm">
          <p className="text-sm text-erp-text-secondary">
            Total revenue from listed customers:{" "}
            <span className="font-semibold text-erp-text">
              {formatGHS(topCustomers.reduce((sum, row) => sum + row.revenue, 0))}
            </span>
          </p>
        </Card>
      )}
    </PageContainer>
  );
}