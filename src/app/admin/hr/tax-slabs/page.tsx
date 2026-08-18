import type { Metadata } from "next";
import { AdminBadge } from "@/components/admin/admin-badge";
import {
  IncomeTaxSlabForm,
  IncomeTaxSlabStatusForm,
} from "@/components/admin/hr/hr-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getIncomeTaxSlabs } from "@/lib/admin/hr";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { statusLabel } from "@/lib/admin/labels";
import { formatGHS } from "@/lib/format";

export const metadata: Metadata = {
  title: "Income Tax Slabs — Yemanuel Store Admin",
};

export default async function AdminIncomeTaxSlabsPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.hr.read)) {
    return <UnauthorizedPage message="Your account does not have the hr.read permission." />;
  }
  const canCreate = hasPermission(session, PERMISSIONS.hr.create);
  const canUpdate = hasPermission(session, PERMISSIONS.hr.update);

  const { slabs, total } = await getIncomeTaxSlabs({ pageSize: 200 });

  return (
    <div className="space-y-4">
      <PageHeader
        title="Income Tax Slabs"
        description={`${total} slab${total === 1 ? "" : "s"} on record. Used when payroll runs ship.`}
      />

      <div className="rounded-lg border border-line bg-white">
        {slabs.length === 0 ? (
          <AdminEmptyState
            title="No tax slabs yet"
            message="Add monthly PAYE brackets to use in future payroll calculations."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Name</Th>
                <Th className="text-right">Lower limit</Th>
                <Th className="text-right">Upper limit</Th>
                <Th className="text-right">Rate</Th>
                <Th>Status</Th>
                {canUpdate && <Th>Actions</Th>}
              </>
            }
          >
            {slabs.map((slab) => (
              <tr key={slab.id} className="align-top transition-colors hover:bg-navy-soft/40">
                <Td className="font-medium">{slab.name}</Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {formatGHS(slab.lowerLimit)}
                </Td>
                <Td className="whitespace-nowrap text-right text-ink-soft">
                  {slab.upperLimit === null ? "Unlimited" : formatGHS(slab.upperLimit)}
                </Td>
                <Td className="whitespace-nowrap text-right font-medium">{slab.rate}%</Td>
                <Td>
                  <AdminBadge tone={slab.isActive ? "success" : "neutral"}>
                    {statusLabel(slab.isActive ? "active" : "inactive")}
                  </AdminBadge>
                </Td>
                {canUpdate && (
                  <Td>
                    <IncomeTaxSlabStatusForm slabId={slab.id} isActive={slab.isActive} />
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
              New slab
            </h2>
            <IncomeTaxSlabForm action="create" />
          </section>
        )}
        {canUpdate && (
          <section className="rounded-lg border border-line bg-white p-5">
            <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
              Edit slabs
            </h2>
            <div className="space-y-6">
              {slabs.map((slab) => (
                <div key={slab.id} className="rounded-lg border border-line p-4">
                  <IncomeTaxSlabForm
                    action="update"
                    initial={{
                      id: slab.id,
                      name: slab.name,
                      lowerLimit: slab.lowerLimit,
                      upperLimit: slab.upperLimit,
                      rate: slab.rate,
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