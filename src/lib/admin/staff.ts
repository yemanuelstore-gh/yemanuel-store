import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminStaffRow = {
  id: string;
  profileId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  position: string;
  status: string;
  hireDate: string | null;
  roles: { id: string; name: string; code: string }[];
  createdAt: string;
};

type StaffListRow = {
  id: string;
  profile_id: string;
  employee_code: string;
  position: string;
  status: string;
  hire_date: string | null;
  created_at: string;
  profiles: { full_name: string; phone: string | null; id: string };
  staff_roles: { roles: { id: string; name: string; code: string } }[];
};

export async function getStaffList({
  q,
  status,
  roleId,
  page = 1,
  pageSize = 25,
}: {
  q?: string;
  status?: string;
  roleId?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ staff: AdminStaffRow[]; total: number }> {
  const client = await createClient();
  let query = client
    .from("staff")
    .select(
      "id, profile_id, employee_code, position, status, hire_date, created_at, profiles(full_name, phone), staff_roles(roles(id, name, code))",
      { count: "exact" },
    );

  if (q && q.trim() !== "") {
    const term = `%${q.trim()}%`;
    query = query.or(
      `employee_code.ilike.${term},position.ilike.${term},profiles.full_name.ilike.${term}`,
    );
  }
  if (status) query = query.eq("status", status);
  if (roleId) query = query.eq("staff_roles.role_id", roleId);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  const rows = (data ?? []) as unknown as StaffListRow[];

  const emails = new Map<string, string>();
  if (rows.length > 0) {
    const profileIds = rows.map((row) => row.profile_id);
    const service = createServiceClient();
    const { data: authUsers } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
    for (const user of authUsers?.users ?? []) {
      if (profileIds.includes(user.id)) {
        emails.set(user.id, user.email ?? "");
      }
    }
  }

  return {
    staff: rows.map((row) => ({
      id: row.id,
      profileId: row.profile_id,
      employeeCode: row.employee_code,
      fullName: row.profiles?.full_name ?? "",
      email: emails.get(row.profile_id) ?? "",
      phone: row.profiles?.phone ?? null,
      position: row.position,
      status: row.status,
      hireDate: row.hire_date,
      roles: (row.staff_roles ?? []).map((link) => link.roles),
      createdAt: row.created_at,
    })),
    total: count ?? 0,
  };
}

export type AdminStaffDetail = {
  id: string;
  profileId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string | null;
  position: string;
  status: string;
  hireDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  roles: { id: string; name: string; code: string; isSystem: boolean }[];
};

export async function getStaffById(id: string): Promise<AdminStaffDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("staff")
    .select(
      "id, profile_id, employee_code, position, status, hire_date, notes, created_at, updated_at, profiles(full_name, phone), staff_roles(roles(id, name, code, is_system))",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    profile_id: string;
    employee_code: string;
    position: string;
    status: string;
    hire_date: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    profiles: { full_name: string; phone: string | null };
    staff_roles: { roles: { id: string; name: string; code: string; is_system: boolean } }[];
  };

  const service = createServiceClient();
  const { data: authUsers } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUser = authUsers?.users.find((user) => user.id === row.profile_id);
  const email = authUser?.email ?? "";

  return {
    id: row.id,
    profileId: row.profile_id,
    employeeCode: row.employee_code,
    fullName: row.profiles?.full_name ?? "",
    email,
    phone: row.profiles?.phone ?? null,
    position: row.position,
    status: row.status,
    hireDate: row.hire_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    roles: (row.staff_roles ?? []).map((link) => ({
      id: link.roles.id,
      name: link.roles.name,
      code: link.roles.code,
      isSystem: link.roles.is_system,
    })),
  };
}

export type AdminRoleRow = {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  staffCount: number;
  permissionCount: number;
};

export async function getRoles(): Promise<AdminRoleRow[]> {
  const client = await createClient();
  const { data } = await client
    .from("roles")
    .select(
      "id, code, name, description, is_system, staff_roles(staff_id), role_permissions(permission_id)",
    )
    .order("name", { ascending: true });

  return ((data ?? []) as unknown as {
    id: string;
    code: string;
    name: string;
    description: string;
    is_system: boolean;
    staff_roles: { staff_id: string }[];
    role_permissions: { permission_id: string }[];
  }[]).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.is_system,
    staffCount: row.staff_roles?.length ?? 0,
    permissionCount: row.role_permissions?.length ?? 0,
  }));
}

export type AdminRoleDetail = {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissionIds: string[];
};

export async function getRoleById(id: string): Promise<AdminRoleDetail | null> {
  const client = await createClient();
  const { data, error } = await client
    .from("roles")
    .select("id, code, name, description, is_system, role_permissions(permission_id)")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;

  const row = data as unknown as {
    id: string;
    code: string;
    name: string;
    description: string;
    is_system: boolean;
    role_permissions: { permission_id: string }[];
  };

  return {
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    isSystem: row.is_system,
    permissionIds: (row.role_permissions ?? []).map((p) => p.permission_id),
  };
}

export type AdminPermission = {
  id: string;
  code: string;
  description: string;
};

export async function getPermissions(): Promise<AdminPermission[]> {
  const client = await createClient();
  const { data } = await client
    .from("permissions")
    .select("id, code, description")
    .order("code", { ascending: true });

  return (data ?? []) as unknown as AdminPermission[];
}