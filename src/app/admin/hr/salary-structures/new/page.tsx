import type { Metadata } from "next";
import { SalaryStructureForm } from "@/components/admin/hr/hr-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "New Salary Structure — Yemanuel Store Admin",
};

export default async function AdminNewSalaryStructurePage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.create)) {
    return <UnauthorizedPage message="Your account does not have the hr.create permission." />;
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="New Salary Structure"
        description="Define a set of salary components used by a group of employees."
      />
      <section className="rounded-lg border border-line bg-white p-5">
        <SalaryStructureForm action="create" />
      </section>
    </div>
  );
}