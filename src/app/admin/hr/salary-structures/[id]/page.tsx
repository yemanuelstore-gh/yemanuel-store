import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  SalaryStructureStatusForm,
  StructureComponentForm,
  StructureComponentRemoveForm,
} from "@/components/admin/hr/hr-forms";
import { AdminButtonLink, DataRow, PageHeader, Td, Th } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getComponentOptions, getSalaryStructureById } from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { salaryComponentTypeTone, statusLabel } from "@/lib/admin/labels";
import { salaryComponentTypeLabel } from "@/lib/admin/hr-constants";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Salary Structure — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminSalaryStructureDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.read)) {
    return <UnauthorizedPage message="Your account does not have the hr.read permission." />;
  }
  const canUpdate = hasPermission(session, PERMISSIONS.hr.update);

  const { id } = await params;
  const [structure, components] = await Promise.all([
    getSalaryStructureById(id),
    getComponentOptions(),
  ]);
  if (!structure) notFound();

  const availableComponents = components.filter(
    (component) => !structure.components.some((item) => item.componentId === component.id),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={structure.name}
        description={`${structure.components.length} components · ${structure.employeeCount} employee${
          structure.employeeCount === 1 ? "" : "s"
        } assigned`}
        actions={
          <>
            <AdminBadge tone={structure.isActive ? "success" : "neutral"}>
              {statusLabel(structure.isActive ? "active" : "inactive")}
            </AdminBadge>
            {canUpdate && (
              <>
                <AdminButtonLink
                  href={`/admin/hr/salary-structures/${structure.id}/edit`}
                  variant="secondary"
                >
                  Edit
                </AdminButtonLink>
                <SalaryStructureStatusForm
                  structureId={structure.id}
                  isActive={structure.isActive}
                />
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-5 lg:col-span-2">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Components
          </h2>
          {structure.components.length === 0 ? (
            <p className="text-[13px] text-ink-faint">
              No components yet — add earnings and deductions below.
            </p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-[11px] uppercase tracking-wider text-ink-faint">
                  <Th>Component</Th>
                  <Th>Type</Th>
                  <Th className="text-right">Amount</Th>
                  {canUpdate && <Th className="text-right">Actions</Th>}
                </tr>
              </thead>
              <tbody>
                {structure.components.map((item) => (
                  <tr key={item.componentId} className="border-b border-line last:border-0">
                    <Td className="font-medium">{item.componentName}</Td>
                    <Td>
                      <AdminBadge tone={salaryComponentTypeTone(item.componentType)}>
                        {salaryComponentTypeLabel(item.componentType)}
                      </AdminBadge>
                    </Td>
                    <Td className="whitespace-nowrap text-right font-medium">
                      {formatGHS(item.amount)}
                    </Td>
                    {canUpdate && (
                      <Td className="text-right">
                        <StructureComponentRemoveForm
                          structureId={structure.id}
                          componentId={item.componentId}
                        />
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {canUpdate && (
            <div className="mt-4 border-t border-line pt-4">
              <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                Add component
              </h3>
              {availableComponents.length === 0 ? (
                <p className="text-[13px] text-ink-faint">
                  All active components are already in this structure.
                </p>
              ) : (
                <StructureComponentForm
                  structureId={structure.id}
                  components={availableComponents}
                />
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Summary
            </h2>
            <dl>
              <DataRow label="Description" value={structure.description ?? "—"} />
              <DataRow label="Employees assigned" value={String(structure.employeeCount)} />
              <DataRow
                label="Net monthly total"
                value={
                  <span className="font-semibold text-navy">{formatGHS(structure.totalMonthly)}</span>
                }
              />
            </dl>
            <p className="mt-3 border-t border-line pt-3 text-[11px] leading-4 text-ink-faint">
              Net monthly total = earnings minus deductions. Tax slabs and statutory deductions
              are applied when payroll runs ship.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Audit metadata
            </h2>
            <dl>
              <DataRow
                label="Created"
                value={`${new Date(structure.createdAt).toLocaleString("en-GB")} · ${
                  structure.createdByName ?? "—"
                }`}
              />
              <DataRow
                label="Last updated"
                value={`${new Date(structure.updatedAt).toLocaleString("en-GB")} · ${
                  structure.updatedByName ?? "—"
                }`}
              />
            </dl>
          </div>
        </div>
      </div>

      <Link
        href="/admin/hr/salary-structures"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All salary structures
      </Link>
    </div>
  );
}