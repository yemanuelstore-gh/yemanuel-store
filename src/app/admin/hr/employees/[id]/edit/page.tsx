import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmployeeForm } from "@/components/admin/hr/hr-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import {
  getComponentOptions,
  getDepartmentOptions,
  getEmployeeById,
  getStaffOptions,
  getStructureOptions,
} from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Edit Employee — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditEmployeePage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.update)) {
    return <UnauthorizedPage message="Your account does not have the hr.update permission." />;
  }

  const { id } = await params;
  const [employee, departments, structures, components, staffOptions] = await Promise.all([
    getEmployeeById(id),
    getDepartmentOptions(),
    getStructureOptions(),
    getComponentOptions(),
    getStaffOptions(),
  ]);
  if (!employee) notFound();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Employee"
        description={`${employee.firstName} ${employee.lastName} · ${employee.employeeCode}`}
      />
      <section className="rounded-lg border border-line bg-white p-5">
        <EmployeeForm
          action="update"
          initial={{
            id: employee.id,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            phone: employee.phone,
            gender: employee.gender,
            dateOfBirth: employee.dateOfBirth,
            hireDate: employee.hireDate,
            employmentType: employee.employmentType,
            employmentStatus: employee.employmentStatus,
            jobTitle: employee.jobTitle,
            socialSecurityNumber: employee.socialSecurityNumber,
            departmentId: employee.departmentId,
            structureId: employee.structureId,
            staffId: employee.staffId,
            emergencyContactName: employee.emergencyContactName,
            emergencyContactPhone: employee.emergencyContactPhone,
            notes: employee.notes,
          }}
          departments={departments}
          structures={structures}
          components={components}
          staffOptions={staffOptions}
        />
      </section>
    </div>
  );
}