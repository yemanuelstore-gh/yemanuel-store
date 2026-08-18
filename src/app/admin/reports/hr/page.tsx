import type { Metadata } from "next";
import { AdminBadge } from "@/components/admin/admin-badge";
import { AdminCardSection, AdminTable, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { KpiCard } from "@/components/admin/dashboard/kpi";
import { BarChart } from "@/components/admin/dashboard/charts";
import { Panel, PanelGrid } from "@/components/admin/dashboard/section";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { formatNumber } from "@/lib/admin/dashboard";
import { getHrReport } from "@/lib/admin/report-hr";
import { formatGHS } from "@/lib/format";
import {
  employeeStatusLabel,
  employmentTypeLabel,
  genderLabel,
} from "@/lib/admin/hr-constants";
import { employeeStatusTone } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "HR Reports — Yemanuel Store Admin",
};

export default async function AdminHrReportPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.reports.view)) {
    return <UnauthorizedPage message="Your account does not have the reports.view permission." />;
  }
  if (!hasPermission(session, PERMISSIONS.hr.read)) {
    return (
      <UnauthorizedPage message="Your account does not have the hr.read permission required for this report." />
    );
  }

  const data = await getHrReport();

  return (
    <div className="space-y-5">
      <PageHeader
        title="HR Reports"
        description="Workforce composition from employee master data and salary structure setup"
      />

      <div className="rounded-lg border border-navy-mist bg-navy-soft px-4 py-2.5 text-xs leading-5 text-ink-soft">
        Attendance, leave and payroll runs are not part of the current HR
        phase — this report covers employee master data and salary structure
        setup only. No attendance, leave or payroll figures are shown.
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Employees" value={formatNumber(data.totalEmployees)} />
        <KpiCard label="Active" value={formatNumber(data.activeEmployees)} tone="positive" />
        <KpiCard label="On leave" value={formatNumber(data.onLeaveEmployees)} />
        <KpiCard label="Departments" value={formatNumber(data.departments)} />
        <KpiCard label="New this year" value={formatNumber(data.newThisYear)} />
        <KpiCard
          label="Avg tenure"
          value={data.averageTenureYears !== null ? `${data.averageTenureYears.toFixed(1)} yrs` : "—"}
        />
      </div>

      <PanelGrid>
        <Panel title="Headcount by department">
          <AdminTable
            head={
              <>
                <Th>Department</Th>
                <Th className="text-right">Total</Th>
                <Th className="text-right">Active</Th>
              </>
            }
          >
            {data.byDepartment.map((row) => (
              <tr key={row.name} className="transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{row.name}</Td>
                <Td className="text-right text-ink-soft">{row.total}</Td>
                <Td className="text-right text-ink-soft">{row.active}</Td>
              </tr>
            ))}
            {data.byDepartment.length === 0 && (
              <tr>
                <Td colSpan={3} className="text-ink-faint">
                  No employees yet.
                </Td>
              </tr>
            )}
          </AdminTable>
        </Panel>
        <Panel title="Headcount by employment type">
          <AdminTable
            head={
              <>
                <Th>Type</Th>
                <Th className="text-right">Employees</Th>
              </>
            }
          >
            {data.byType.map((row) => (
              <tr key={row.type} className="transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{employmentTypeLabel(row.type)}</Td>
                <Td className="text-right text-ink-soft">{row.count}</Td>
              </tr>
            ))}
            {data.byType.length === 0 && (
              <tr>
                <Td colSpan={2} className="text-ink-faint">
                  No employees yet.
                </Td>
              </tr>
            )}
          </AdminTable>
        </Panel>
      </PanelGrid>

      <PanelGrid>
        <Panel title="New hires by year">
          <BarChart
            data={data.newByYear.map((row) => ({ label: String(row.year), value: row.count }))}
            formatValue={(value) => formatNumber(value)}
            color="#c9a227"
            valueLabels
          />
        </Panel>
        <Panel title="Employment status">
          <AdminTable
            head={
              <>
                <Th>Status</Th>
                <Th className="text-right">Employees</Th>
              </>
            }
          >
            {data.byStatus.map((row) => (
              <tr key={row.status} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <AdminBadge tone={employeeStatusTone(row.status)}>
                    {employeeStatusLabel(row.status)}
                  </AdminBadge>
                </Td>
                <Td className="text-right text-ink-soft">{row.count}</Td>
              </tr>
            ))}
            {data.byStatus.length === 0 && (
              <tr>
                <Td colSpan={2} className="text-ink-faint">
                  No employees yet.
                </Td>
              </tr>
            )}
          </AdminTable>
        </Panel>
      </PanelGrid>

      <AdminCardSection
        title="Salary structures"
        headerExtra={
          <span className="text-[11px] text-ink-faint">
            Monthly gross budget:{" "}
            <span className="font-semibold text-ink">{formatGHS(data.monthlyBudgetTotal)}</span>
          </span>
        }
      >
        <AdminTable
          head={
            <>
              <Th>Structure</Th>
              <Th className="text-right">Components</Th>
              <Th className="text-right">Monthly budget</Th>
            </>
          }
        >
          {data.structures.map((row) => (
            <tr key={row.name} className="transition-colors hover:bg-navy-soft/40">
              <Td className="font-medium">{row.name}</Td>
              <Td className="text-right text-ink-soft">{row.componentCount}</Td>
              <Td className="whitespace-nowrap text-right font-medium">
                {formatGHS(row.monthlyBudget)}
              </Td>
            </tr>
          ))}
          {data.structures.length === 0 && (
            <tr>
              <Td colSpan={3} className="text-ink-faint">
                No salary structures configured yet. Monthly budget is the sum
                of salary structure component amounts and does not account for
                payroll runs, which are not implemented yet.
              </Td>
            </tr>
          )}
        </AdminTable>
      </AdminCardSection>

      {data.genderCounts.length > 0 && (
        <p className="text-[11px] leading-4 text-ink-faint">
          Gender split:{" "}
          {data.genderCounts
            .map((row) => `${genderLabel(row.gender)} ${row.count}`)
            .join(" · ")}
          .
        </p>
      )}
    </div>
  );
}