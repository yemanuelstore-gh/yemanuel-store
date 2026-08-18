import type { Metadata } from "next";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  SalaryComponentForm,
  SalaryComponentStatusForm,
} from "@/components/admin/hr/hr-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getSalaryComponents } from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { salaryComponentTypeTone, statusLabel } from "@/lib/admin/labels";
import { salaryComponentTypeLabel } from "@/lib/admin/hr-constants";

export const metadata: Metadata = {
  title: "Salary Components — Yemanuel Store Admin",
};

export default async function AdminSalaryComponentsPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.read)) {
    return <UnauthorizedPage message="Your account does not have the hr.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.hr.create);
  const canUpdate = hasPermission(session, PERMISSIONS.hr.update);

  const { components, total } = await getSalaryComponents({ pageSize: 200 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Salary Components"
        description={`${total} component${total === 1 ? "" : "s"} on record.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {components.length === 0 ? (
          <AdminEmptyState
            title="No salary components yet"
            message="Create components to build salary structures (e.g. Basic Salary, Transport Allowance, PAYE)."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Name</Th>
                <Th>Type</Th>
                <Th>Description</Th>
                <Th className="text-right">Used in</Th>
                <Th>Status</Th>
                {canUpdate && <Th>Actions</Th>}
              </>
            }
          >
            {components.map((component) => (
              <tr key={component.id} className="align-top transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{component.name}</Td>
                <Td>
                  <AdminBadge tone={salaryComponentTypeTone(component.componentType)}>
                    {salaryComponentTypeLabel(component.componentType)}
                  </AdminBadge>
                </Td>
                <Td className="text-ink-soft">{component.description ?? "—"}</Td>
                <Td className="text-right text-ink-soft">{component.usageCount}</Td>
                <Td>
                  <AdminBadge
                    tone={component.isActive ? "success" : "neutral"}
                  >
                    {statusLabel(component.isActive ? "active" : "inactive")}
                  </AdminBadge>
                </Td>
                {canUpdate && (
                  <Td>
                    <SalaryComponentStatusForm
                      componentId={component.id}
                      isActive={component.isActive}
                    />
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
              New component
            </h2>
            <SalaryComponentForm action="create" />
          </section>
        )}
        {canUpdate && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Edit components
            </h2>
            <div className="space-y-6">
              {components.map((component) => (
                <div key={component.id} className="rounded-lg border border-line p-4">
                  <SalaryComponentForm
                    action="update"
                    initial={{
                      id: component.id,
                      name: component.name,
                      componentType: component.componentType,
                      description: component.description,
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