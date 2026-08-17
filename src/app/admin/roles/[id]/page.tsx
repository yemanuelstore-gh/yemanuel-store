import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBadge } from "@/components/admin/admin-badge";
import { RoleForm, RolePermissionsForm } from "@/components/admin/staff-forms";
import { PageHeader } from "@/components/admin/ui";
import { UnauthorizedPage } from "@/components/admin/unauthorized";
import { getPermissions, getRoleById } from "@/lib/admin/staff";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";

export const metadata: Metadata = {
  title: "Role — Yemanuel Store Admin",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminRoleDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) return null;
  if (!hasPermission(session, PERMISSIONS.staff.manage)) {
    return (
      <UnauthorizedPage message="Your account does not have the staff.manage permission." />
    );
  }

  const { id } = await params;
  const [role, permissions] = await Promise.all([getRoleById(id), getPermissions()]);
  if (!role) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={role.name}
        description={`${role.code} · ${role.permissionIds.length} permission${
          role.permissionIds.length === 1 ? "" : "s"
        }`}
        actions={
          <AdminBadge tone={role.isSystem ? "warning" : "neutral"}>
            {role.isSystem ? "System role" : "Custom role"}
          </AdminBadge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-5">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-soft">
            Edit role
          </h2>
          <RoleForm
            initial={{
              id: role.id,
              name: role.name,
              description: role.description,
              isSystem: role.isSystem,
            }}
          />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-5">
        <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-soft">
          Permissions
        </h2>
        <p className="mb-4 text-xs leading-5 text-ink-soft">
          Every permission controls one server-side capability. Staff inherit these
          through the roles assigned to them — permission changes apply immediately.
        </p>
        <RolePermissionsForm
          role={{ id: role.id, name: role.name, isSystem: role.isSystem }}
          permissions={permissions}
          permissionIds={role.permissionIds}
        />
      </div>

      <Link
        href="/admin/roles"
        className="text-[11px] font-semibold text-navy hover:underline"
      >
        ← All roles
      </Link>
    </div>
  );
}