import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { EmployeeStatusForm } from "@/components/admin/hr/hr-forms";
import { EmployeeSummaryCards } from "@/components/admin/hr/hr-summary";
import {
  AdminButtonLink,
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Pagination,
  SearchForm,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getEmployeeSummary, getEmployees } from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { employeeStatusTone, statusLabel } from "@/lib/admin/labels";
import {
  EMPLOYEE_STATUSES,
  employeeStatusLabel,
  employmentTypeLabel,
} from "@/lib/admin/hr-constants";

export const metadata: Metadata = {
  title: "Employees — Yemanuel Store Admin",
};

type SearchParams = Promise<{ q?: string; status?: string; dept?: string; page?: string }>;

export default async function AdminEmployeesPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.read)) {
    return <UnauthorizedPage message="Your account does not have the hr.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.hr.create);
  const canUpdate = hasPermission(session, PERMISSIONS.hr.update);

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [summary, result] = await Promise.all([
    getEmployeeSummary(),
    getEmployees({ q: params.q, status: params.status, departmentId: params.dept, page }),
  ]);

  const filterParams = new URLSearchParams();
  if (params.q) filterParams.set("q", params.q);
  if (params.status) filterParams.set("status", params.status);
  if (params.dept) filterParams.set("dept", params.dept);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Employees"
        description="People records for payroll and workforce management."
        actions={
          canCreate ? (
            <AdminButtonLink href="/admin/hr/employees/new">New employee</AdminButtonLink>
          ) : undefined
        }
      />

      <EmployeeSummaryCards
        total={summary.total}
        active={summary.active}
        onLeave={summary.onLeave}
        departments={summary.departments}
      />

      <div className="rounded-lg border border-line bg-white">
        <div className="border-b border-line px-4 py-2.5">
          <SearchForm
            placeholder="Search name, code, email or title…"
            initialValue={params.q ?? ""}
            extraFields={
              <select
                name="status"
                defaultValue={params.status ?? ""}
                aria-label="Filter by employment status"
                className="h-8 rounded-md border border-line-strong bg-white px-2 text-xs text-ink"
              >
                <option value="">All statuses</option>
                {EMPLOYEE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {employeeStatusLabel(status)}
                  </option>
                ))}
              </select>
            }
          />
        </div>

        {result.employees.length === 0 ? (
          <AdminEmptyState
            title="No employees found"
            message="Try a different search, or add the first employee record."
            actionHref={canCreate ? "/admin/hr/employees/new" : undefined}
            actionLabel={canCreate ? "New employee" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Employee</Th>
                <Th>Code</Th>
                <Th>Department</Th>
                <Th>Job title</Th>
                <Th>Type</Th>
                <Th>Hired</Th>
                <Th>Status</Th>
                {canUpdate && <Th>Actions</Th>}
              </>
            }
          >
            {result.employees.map((employee) => (
              <tr key={employee.id} className="align-top transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/hr/employees/${employee.id}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {employee.fullName}
                  </Link>
                </Td>
                <Td className="whitespace-nowrap font-mono text-xs text-ink-soft">
                  {employee.employeeCode}
                </Td>
                <Td className="text-ink-soft">{employee.departmentName ?? "—"}</Td>
                <Td className="text-ink-soft">{employee.jobTitle ?? "—"}</Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {employmentTypeLabel(employee.employmentType)}
                </Td>
                <Td className="whitespace-nowrap text-ink-soft">
                  {new Date(employee.hireDate).toLocaleDateString("en-GB")}
                </Td>
                <Td>
                  <AdminBadge tone={employeeStatusTone(employee.employmentStatus)}>
                    {statusLabel(employee.employmentStatus)}
                  </AdminBadge>
                </Td>
                {canUpdate && (
                  <Td>
                    <div className="flex flex-col items-start gap-1.5">
                      <Link
                        href={`/admin/hr/employees/${employee.id}`}
                        className="text-xs font-medium text-navy hover:underline"
                      >
                        View
                      </Link>
                      <Link
                        href={`/admin/hr/employees/${employee.id}/edit`}
                        className="text-xs font-medium text-navy hover:underline"
                      >
                        Edit
                      </Link>
                      <EmployeeStatusForm
                        employeeId={employee.id}
                        currentStatus={employee.employmentStatus}
                      />
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </AdminTable>
        )}
        <Pagination
          page={page}
          pageSize={25}
          total={result.total}
          basePath="/admin/hr/employees"
          searchParams={filterParams}
        />
      </div>
    </div>
  );
}