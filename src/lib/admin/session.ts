import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminSession = {
  userId: string;
  email: string;
  fullName: string | null;
  staff: {
    id: string;
    employeeCode: string;
    position: string;
    status: string;
  };
  roles: string[];
  permissions: Set<string>;
};

type StaffRow = {
  id: string;
  employee_code: string;
  position: string;
  status: string;
  staff_roles: { role_id: string }[];
};

type RoleRow = {
  id: string;
  code: string;
  name: string;
  role_permissions: { permission_id: string }[];
};

type PermissionRow = {
  id: string;
  code: string;
};

/**
 * Resolve the currently signed-in auth user (if any). Used by the admin
 * layout to tell "not signed in" apart from "signed in but not staff".
 */
export const getAuthUser = cache(
  async (): Promise<{ id: string; email: string } | null> => {
    if (!isSupabaseConfigured()) return null;
    const client = await createClient();
    const { data } = await client.auth.getUser();
    const user = data.user;
    if (!user) return null;
    return { id: user.id, email: user.email ?? "" };
  },
);

/**
 * Resolve the signed-in user's staff record, roles and permission codes.
 *
 * The `staff` table is only readable by staff managers, so the staff record
 * is resolved with the service-role client on the server. All business data
 * reads in admin pages still go through the authenticated client so RLS
 * applies per query.
 */
export const getAdminSession = cache(
  async (): Promise<AdminSession | null> => {
    const authUser = await getAuthUser();
    if (!authUser) return null;

    const service = createServiceClient();

    const [profileResult, staffResult] = await Promise.all([
      service
        .from("profiles")
        .select("full_name")
        .eq("id", authUser.id)
        .maybeSingle(),
      service
        .from("staff")
        .select("id, employee_code, position, status, staff_roles(role_id)")
        .eq("profile_id", authUser.id)
        .maybeSingle(),
    ]);

    const staffRow = staffResult.data as StaffRow | null;
    if (staffResult.error || !staffRow) return null;

    const roleIds = (staffRow.staff_roles ?? []).map((role) => role.role_id);

    const [rolesResult, permissionsResult] = await Promise.all([
      service
        .from("roles")
        .select("id, code, name, role_permissions(permission_id)")
        .in("id", roleIds.length > 0 ? roleIds : ["00000000-0000-0000-0000-000000000000"]),
      service.from("permissions").select("id, code"),
    ]);

    const roleRows = (rolesResult.data ?? []) as unknown as RoleRow[];
    const permissionRows = (permissionsResult.data ?? []) as unknown as PermissionRow[];

    const permissionIds = new Set<string>();
    roleRows.forEach((role) =>
      (role.role_permissions ?? []).forEach((rp) => permissionIds.add(rp.permission_id)),
    );

    const permissions = new Set(
      permissionRows
        .filter((permission) => permissionIds.has(permission.id))
        .map((permission) => permission.code),
    );

    return {
      userId: authUser.id,
      email: authUser.email,
      fullName:
        profileResult.data && !profileResult.error
          ? ((profileResult.data as { full_name: string }).full_name ?? null)
          : null,
      staff: {
        id: staffRow.id,
        employeeCode: staffRow.employee_code,
        position: staffRow.position,
        status: staffRow.status,
      },
      roles: roleRows.map((role) => role.code),
      permissions,
    };
  },
);

export function hasPermission(session: AdminSession | null, code: string): boolean {
  return session !== null && session.permissions.has(code);
}

export function hasAnyPermission(session: AdminSession | null, codes: string[]): boolean {
  return session !== null && codes.some((code) => session.permissions.has(code));
}