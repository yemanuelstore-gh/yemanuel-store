import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  DepartmentForm,
  DepartmentStatusForm,
} from "@/components/admin/hr/hr-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getDepartments } from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { entityStatusTone, statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Departments — Yemanuel Store Admin",
};

export default async function AdminDepartmentsPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.read)) {
    return <UnauthorizedPage message="Your account does not have the hr.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.hr.create);
  const canUpdate = hasPermission(session, PERMISSIONS.hr.update);

  const { departments, total } = await getDepartments({ pageSize: 200 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Departments"
        description={`${total} department${total === 1 ? "" : "s"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {departments.length === 0 ? (
          <AdminEmptyState
            title="No departments yet"
            message="Create departments to organise employees (e.g. Sales, Operations, Finance)."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th className="text-right">Employees</Th>
                <Th>Status</Th>
                {canUpdate && <Th>Actions</Th>}
              </>
            }
          >
            {departments.map((department) => (
              <tr
                key={department.id}
                className="align-top transition-colors hover:bg-navy-soft/40"
              >
                <Td className="font-medium">{department.name}</Td>
                <Td className="text-ink-soft">{department.description ?? "—"}</Td>
                <Td className="text-right text-ink-soft">
                  <Link
                    href={`/admin/hr/employees?dept=${department.id}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {department.employeeCount}
                  </Link>
                </Td>
                <Td>
                  <AdminBadge tone={entityStatusTone(department.isActive ? "active" : "inactive")}>
                    {statusLabel(department.isActive ? "active" : "inactive")}
                  </AdminBadge>
                </Td>
                {canUpdate && (
                  <Td>
                    <DepartmentStatusForm departmentId={department.id} isActive={department.isActive} />
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
              New department
            </h2>
            <DepartmentForm action="create" />
          </section>
        )}
        {canUpdate && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Edit departments
            </h2>
            <div className="space-y-6">
              {departments.map((department) => (
                <div key={department.id} className="rounded-lg border border-line p-4">
                  <DepartmentForm
                    action="update"
                    initial={{
                      id: department.id,
                      name: department.name,
                      description: department.description,
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