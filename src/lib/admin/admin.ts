import type { DashboardClient } from "@/lib/admin/dashboard";
import type { ListQuery, ListResult } from "@/lib/admin/query";
import { listQuery } from "@/lib/admin/query";

export { PAGE_SIZE } from "@/lib/admin/query";

export type UserListRow = {
  id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles: string[];
};

export async function listUsers(
  client: DashboardClient,
  params: ListQuery & { q?: string },
): Promise<ListResult<UserListRow>> {
  const { data: profileRows, error: profileError } = await client
    .from("profiles")
    .select("id, full_name, phone, created_at")
    .order("created_at", { ascending: false });
  if (profileError) throw profileError;

  const { data: staffRows } = await client.from("staff").select("id, profile_id");
  const { data: staffRoleRows } = await client.from("staff_roles").select("staff_id, role_id");
  const { data: roleRows } = await client.from("roles").select("id, name");

  const roleNameById = new Map((roleRows ?? []).map((role) => [role.id, role.name]));
  const staffByProfile = new Map<string, string>();
  for (const staff of staffRows ?? []) {
    if (!staff.profile_id) continue;
    staffByProfile.set(staff.profile_id, staff.id);
  }
  const rolesByStaff = new Map<string, string[]>();
  for (const assignment of staffRoleRows ?? []) {
    const roles = rolesByStaff.get(assignment.staff_id) ?? [];
    const name = roleNameById.get(assignment.role_id);
    if (name) roles.push(name);
    rolesByStaff.set(assignment.staff_id, roles);
  }

  let rows = (profileRows ?? []).map((profile) => {
    const staffId = staffByProfile.get(profile.id);
    return {
      id: profile.id,
      full_name: profile.full_name,
      phone: profile.phone,
      created_at: profile.created_at,
      roles: staffId ? rolesByStaff.get(staffId) ?? [] : [],
    };
  });

  if (params.q) {
    const term = params.q.trim().toLowerCase();
    rows = rows.filter(
      (row) =>
        (row.full_name ?? "").toLowerCase().includes(term) ||
        (row.phone ?? "").toLowerCase().includes(term),
    );
  }

  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 25;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), total: rows.length };
}

export type RoleListRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  is_system: boolean;
  permission_count: number;
};

export async function listRoles(client: DashboardClient): Promise<RoleListRow[]> {
  const [rolesResult, assignmentsResult] = await Promise.all([
    client.from("roles").select("id, code, name, description, is_system").order("name", { ascending: true }),
    client.from("role_permissions").select("role_id"),
  ]);
  if (rolesResult.error) throw rolesResult.error;

  const countByRole = new Map<string, number>();
  for (const assignment of assignmentsResult.data ?? []) {
    countByRole.set(assignment.role_id, (countByRole.get(assignment.role_id) ?? 0) + 1);
  }

  return (rolesResult.data ?? []).map((role) => ({
    ...role,
    permission_count: countByRole.get(role.id) ?? 0,
  }));
}

export type PermissionListRow = {
  id: string;
  code: string;
  description: string | null;
};

export async function listPermissions(client: DashboardClient): Promise<PermissionListRow[]> {
  const { data, error } = await client
    .from("permissions")
    .select("id, code, description")
    .order("code", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export type AuditLogListRow = {
  id: string;
  actor_id: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function listAuditLogs(
  client: DashboardClient,
  params: ListQuery & { action?: string; entity?: string },
): Promise<ListResult<AuditLogListRow>> {
  return listQuery(
    client,
    "audit_logs",
    params,
    (q) => {
      let query = q.order("created_at", { ascending: false });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(
            `action.ilike.%${term}%,entity_type.ilike.%${term}%,actor_id.ilike.%${term}%`,
          );
        }
      }
      if (params.action) query = query.eq("action", params.action);
      if (params.entity) query = query.eq("entity_type", params.entity);
      return query;
    },
    "id, actor_id, action, entity_type, entity_id, metadata, created_at",
  );
}

export type SettingListRow = {
  id: string;
  key: string;
  value: string | null;
  description: string | null;
  is_system: boolean;
  updated_at: string;
  locations: { name: string } | null;
};

export function listSettings(
  client: DashboardClient,
  params: ListQuery & { q?: string },
): Promise<ListResult<SettingListRow>> {
  return listQuery(
    client,
    "settings",
    params,
    (q) => {
      let query = q.order("key", { ascending: true });
      if (params.q) {
        const term = params.q.trim();
        if (term) {
          query = query.or(`key.ilike.%${term}%,description.ilike.%${term}%`);
        }
      }
      return query;
    },
    "id, key, value, description, is_system, updated_at, locations(name)",
  );
}