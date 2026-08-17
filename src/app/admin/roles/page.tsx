import type { Metadata } from "next";
import Link from "next/link";
import { RoleForm } from "@/components/admin/staff-forms";
import {
  AdminEmptyState,
  AdminTable,
  PageHeader,
  Td,
  Th,
} from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getRoles } from "@/lib/admin/staff";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Roles — Yemanuel Store Admin",
};

export default async function AdminRolesPage() {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.staff.manage)) {
    return (
      <UnauthorizedPage message="Your account does not have the staff.manage permission." />
    );
  }

  const roles = await getRoles();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles"
        description="Roles bundle permissions. Assign them to staff members to control what each account can see and do."
      />

      <div className="rounded-lg border border-line bg-white">
        {roles.length === 0 ? (
          <AdminEmptyState
            title="No roles yet"
            message="Create a role to start bundling permissions."
          />
        ) : (
          <AdminTable
            head={
              <>
                <Th>Role</Th>
                <Th>Code</Th>
                <Th>Description</Th>
                <Th className="text-right">Permissions</Th>
                <Th className="text-right">Staff</Th>
                <Th>Type</Th>
              </>
            }
          >
            {roles.map((role) => (
              <tr key={role.id} className="transition-colors hover:bg-navy-soft/40">
                <Td>
                  <Link
                    href={`/admin/roles/${role.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {role.name}
                  </Link>
                </Td>
                <Td>
                  <span className="font-mono text-xs text-ink-soft">{role.code}</span>
                </Td>
                <Td className="max-w-xs truncate text-ink-soft">{role.description}</Td>
                <Td className="text-right text-ink-soft">{role.permissionCount}</Td>
                <Td className="text-right text-ink-soft">{role.staffCount}</Td>
                <Td>
                  {role.isSystem ? (
                    <span className="rounded bg-gold-soft px-1.5 py-0.5 text-[11px] font-medium text-gold-dark">
                      System
                    </span>
                  ) : (
                    <span className="text-xs text-ink-faint">Custom</span>
                  )}
                </Td>
              </tr>
            ))}
          </AdminTable>
        )}
      </div>

      <section className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
          New role
        </h2>
        <RoleForm />
      </section>
    </div>
  );
}