import type { Metadata } from "next";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  PayrollPeriodForm,
  PayrollPeriodStatusForm,
} from "@/components/admin/hr/hr-forms";
import { PayrollPeriodSummaryCards } from "@/components/admin/hr/hr-summary";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getPayrollPeriods, getPayrollPeriodSummary } from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { payrollPeriodStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Payroll Periods — Yemanuel Store Admin",
};

export default async function AdminPayrollPeriodsPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.read)) {
    return <UnauthorizedPage message="Your account does not have the hr.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.hr.create);
  const canUpdate = hasPermission(session, PERMISSIONS.hr.update);

  const [summary, { periods, total }] = await Promise.all([
    getPayrollPeriodSummary(),
    getPayrollPeriods({ pageSize: 200 }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payroll Periods"
        description={`${total} period${total === 1 ? "" : "s"} on record.`}
      />

      <PayrollPeriodSummaryCards
        total={summary.total}
        open={summary.open}
        closed={summary.closed}
      />

      <div className="rounded-lg border border-line bg-white">
        {periods.length === 0 ? (
          <AdminEmptyState
            title="No payroll periods yet"
            message="Create periods to scope future payroll runs (e.g. August 2026)."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Name</Th>
                <Th>Start</Th>
                <Th>End</Th>
                <Th>Notes</Th>
                <Th>Status</Th>
                {canUpdate && <Th>Actions</Th>}
              </>
            }
          >
            {periods.map((period) => (
              <tr key={period.id} className="align-top transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{period.name}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(period.startDate).toLocaleDateString("en-GB")}
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(period.endDate).toLocaleDateString("en-GB")}
                </Td>
                <Td className="text-ink-soft">{period.notes ?? "—"}</Td>
                <Td>
                  <AdminBadge tone={payrollPeriodStatusTone(period.status)}>
                    {statusLabel(period.status)}
                  </AdminBadge>
                </Td>
                {canUpdate && (
                  <Td>
                    <PayrollPeriodStatusForm periodId={period.id} status={period.status} />
                  </Td>
                )}
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {canCreate && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              New period
            </h2>
            <PayrollPeriodForm action="create" />
          </section>
        )}
        {canUpdate && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Edit periods
            </h2>
            <div className="space-y-6">
              {periods.map((period) => (
                <div key={period.id} className="rounded-lg border border-line p-4">
                  <PayrollPeriodForm
                    action="update"
                    initial={{
                      id: period.id,
                      name: period.name,
                      startDate: period.startDate,
                      endDate: period.endDate,
                      notes: period.notes,
                    }}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}