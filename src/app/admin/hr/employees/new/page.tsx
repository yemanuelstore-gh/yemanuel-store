import type { Metadata } from "next";
import { EmployeeForm } from "@/components/admin/hr/hr-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import {
  getComponentOptions,
  getDepartmentOptions,
  getStaffOptions,
  getStructureOptions,
} from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "New Employee — Yemanuel Store Admin",
};

export default async function AdminNewEmployeePage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.create)) {
    return <UnauthorizedPage message="Your account does not have the hr.create permission." />;
  }

  const [departments, structures, components, staffOptions] = await Promise.all([
    getDepartmentOptions(),
    getStructureOptions(),
    getComponentOptions(),
    getStaffOptions(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Employee"
        description="Add a person record for payroll and workforce management."
      />
      <section className="rounded-lg border border-line bg-white p-5">
        <EmployeeForm
          action="create"
          departments={departments}
          structures={structures}
          components={components}
          staffOptions={staffOptions}
        />
      </section>
    </div>
  );
}