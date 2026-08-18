import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { EmployeeStatusForm } from "@/components/admin/hr/hr-forms";
import { AdminButtonLink, DataRow, PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getEmployeeById } from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { employeeStatusTone, statusLabel } from "@/lib/admin/labels";
import {
  employmentTypeLabel,
  genderLabel,
} from "@/lib/admin/hr-constants";
import { formatGhanaPhone } from "@/lib/format";

export const metadata: Metadata = {
  title: "Employee — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEmployeeDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.read)) {
    return <UnauthorizedPage message="Your account does not have the hr.read permission." />;
  }
  const canUpdate = hasPermission(session, PERMISSIONS.hr.update);

  const { id } = await params;
  const employee = await getEmployeeById(id);
  if (!employee) notFound();

  const displayPhone = (phone: string | null) =>
    phone ? formatGhanaPhone(phone) : "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${employee.firstName} ${employee.lastName}`}
        description={`${employee.employeeCode} · Hired ${new Date(
          employee.hireDate,
        ).toLocaleDateString("en-GB")}`}
        actions={
          <>
            <AdminBadge tone={employeeStatusTone(employee.employmentStatus)}>
              {statusLabel(employee.employmentStatus)}
            </AdminBadge>
            {canUpdate && (
              <>
                <AdminButtonLink href={`/admin/hr/employees/${employee.id}/edit`} variant="secondary">
                  Edit
                </AdminButtonLink>
                <EmployeeStatusForm
                  employeeId={employee.id}
                  currentStatus={employee.employmentStatus}
                />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Personal details
          </h2>
          <dl>
            <DataRow label="Full name" value={`${employee.firstName} ${employee.lastName}`} />
            <DataRow label="Email" value={employee.email ?? "—"} />
            <DataRow label="Phone" value={displayPhone(employee.phone)} />
            <DataRow label="Gender" value={employee.gender ? genderLabel(employee.gender) : "—"} />
            <DataRow
              label="Date of birth"
              value={
                employee.dateOfBirth
                  ? new Date(employee.dateOfBirth).toLocaleDateString("en-GB")
                  : "—"
              }
            />
          </dl>
        </div>

        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Employment
          </h2>
          <dl>
            <DataRow label="Job title" value={employee.jobTitle ?? "—"} />
            <DataRow label="Department" value={employee.departmentName ?? "—"} />
            <DataRow label="Employment type" value={employmentTypeLabel(employee.employmentType)} />
            <DataRow label="Salary structure" value={employee.structureName ?? "—"} />
            <DataRow label="Staff account" value={employee.staffName ?? "—"} />
            <DataRow
              label="Social security number"
              value={<span className="font-mono">{employee.socialSecurityNumber ?? "—"}</span>}
            />
          </dl>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Emergency contact
          </h2>
          <dl>
            <DataRow label="Name" value={employee.emergencyContactName ?? "—"} />
            <DataRow label="Phone" value={displayPhone(employee.emergencyContactPhone)} />
          </dl>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">Notes</h2>
            <p className="text-[13px] leading-6 text-ink">{employee.notes ?? "—"}</p>
          </div>
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Audit metadata
            </h2>
            <dl>
              <DataRow
                label="Created"
                value={`${new Date(employee.createdAt).toLocaleString("en-GB")} · ${
                  employee.createdByName ?? "—"
                }`}
              />
              <DataRow
                label="Last updated"
                value={`${new Date(employee.updatedAt).toLocaleString("en-GB")} · ${
                  employee.updatedByName ?? "—"
                }`}
              />
            </dl>
          </div>
        </div>
      </div>

      <Link
        href="/admin/hr/employees"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All employees
      </Link>
    </div>
  );
}