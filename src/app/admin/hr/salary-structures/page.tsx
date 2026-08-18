import type { Metadata } from "next";
import Link from "next/link";
import { AdminBadge } from "@/components/admin/admin-badge";
import { SalaryStructureStatusForm } from "@/components/admin/hr/hr-forms";
import {
  AdminButtonLink,
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getSalaryStructures } from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { statusLabel } from "@/lib/admin/labels";

export const metadata: Metadata = {
  title: "Salary Structures — Yemanuel Store Admin",
};

export default async function AdminSalaryStructuresPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.read)) {
    return <UnauthorizedPage message="Your account does not have the hr.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.hr.create);
  const canUpdate = hasPermission(session, PERMISSIONS.hr.update);

  const { structures, total } = await getSalaryStructures({ pageSize: 200 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Salary Structures"
        description={`${total} structure${total === 1 ? "" : "s"} on record.`}
        actions={
          canCreate ? (
            <AdminButtonLink href="/admin/hr/salary-structures/new">
              New salary structure
            </AdminButtonLink>
          ) : undefined
        }
      />

      <div className="rounded-lg border border-line bg-white">
        {structures.length === 0 ? (
          <AdminEmptyState
            title="No salary structures yet"
            message="Create structures to group salary components for employees."
            actionHref={canCreate ? "/admin/hr/salary-structures/new" : undefined}
            actionLabel={canCreate ? "New salary structure" : undefined}
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Name</Th>
                <Th>Description</Th>
                <Th className="text-right">Components</Th>
                <Th className="text-right">Employees</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </>
            }
          >
            {structures.map((structure) => (
              <tr key={structure.id} className="align-top transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/hr/salary-structures/${structure.id}`}
                    className="font-medium text-navy hover:underline"
                  >
                    {structure.name}
                  </Link>
                </Td>
                <Td className="text-ink-soft">{structure.description ?? "—"}</Td>
                <Td className="text-right text-ink-soft">{structure.componentCount}</Td>
                <Td className="text-right text-ink-soft">{structure.employeeCount}</Td>
                <Td>
                  <AdminBadge tone={structure.isActive ? "success" : "neutral"}>
                    {statusLabel(structure.isActive ? "active" : "inactive")}
                  </AdminBadge>
                </Td>
                <Td>
                  <div className="flex flex-col items-start gap-1.5">
                    <Link
                      href={`/admin/hr/salary-structures/${structure.id}`}
                      className="text-xs font-medium text-navy hover:underline"
                    >
                      View
                    </Link>
                    {canUpdate && (
                      <>
                        <Link
                          href={`/admin/hr/salary-structures/${structure.id}/edit`}
                          className="text-xs font-medium text-navy hover:underline"
                        >
                          Edit
                        </Link>
                        <SalaryStructureStatusForm
                          structureId={structure.id}
                          isActive={structure.isActive}
                        />
                      </>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>
    </div>
  );
}