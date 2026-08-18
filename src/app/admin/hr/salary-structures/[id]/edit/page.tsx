import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SalaryStructureForm } from "@/components/admin/hr/hr-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getSalaryStructureById } from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Edit Salary Structure — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminEditSalaryStructurePage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.update)) {
    return <UnauthorizedPage message="Your account does not have the hr.update permission." />;
  }

  const { id } = await params;
  const structure = await getSalaryStructureById(id);
  if (!structure) notFound();

  return (
    <div className="space-y-4">
      <PageHeader title="Edit Salary Structure" description={structure.name} />
      <section className="rounded-lg border border-line bg-white p-5">
        <SalaryStructureForm
          action="update"
          initial={{
            id: structure.id,
            name: structure.name,
            description: structure.description,
          }}
        />
      </section>
    </div>
  );
}