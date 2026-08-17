"use server";

import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { nextDocumentNumber } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

const VALID_STAFF_STATUS = ["active", "inactive", "suspended"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "A record with the same key already exists.";
    if (text.includes("already been registered")) {
      return "An account with that email already exists.";
    }
    return text;
  }
  return fallback;
}

export async function createStaffAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.staff.manage)) {
    return { ok: false, message: "You do not have permission to manage staff." };
  }

  const fullName = formData.get("fullName");
  const email = formData.get("email");
  const phone = formData.get("phone");
  const position = formData.get("position");
  const status = formData.get("status");
  const hireDate = formData.get("hireDate");
  const notes = formData.get("notes");
  const roleIds = formData.getAll("roleIds").filter(
    (value): value is string => typeof value === "string" && value !== "",
  );

  if (typeof fullName !== "string" || fullName.trim().length < 2) {
    return { ok: false, message: "Full name must be at least 2 characters." };
  }
  if (typeof email !== "string" || !EMAIL_PATTERN.test(email.trim())) {
    return { ok: false, message: "Enter a valid email address." };
  }
  if (typeof position !== "string" || position.trim().length < 2) {
    return { ok: false, message: "Position must be at least 2 characters." };
  }
  if (typeof status !== "string" || !VALID_STAFF_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid status." };
  }

  const client = await createClient();

  // Role validation — confirm every chosen role exists (system check on top of RLS).
  const rolesResult = await client.from("roles").select("id");
  const knownRoleIds = new Set((rolesResult.data ?? []).map((r) => r.id));
  if (roleIds.some((id) => !knownRoleIds.has(id))) {
    return { ok: false, message: "One of the chosen roles is invalid." };
  }

  if (!isServiceConfigured()) {
    return { ok: false, message: "Staff provisioning is not configured on this environment." };
  }

  // 1. Provision the auth user (server-side only, never exposed to the browser).
  const service = createServiceClient();
  const { data: createdUser, error: createError } = await service.auth.admin.createUser({
    email: email.trim(),
    password: randomPassword(),
    email_confirm: true,
    user_metadata: { full_name: fullName.trim() },
  });
  if (createError) {
    return { ok: false, message: message(createError, "Could not create the staff account.") };
  }
  const authUserId = createdUser.user?.id;
  if (!authUserId) {
    return { ok: false, message: "Could not create the staff account." };
  }

  try {
    // 2. Profile row (the application-owned identity).
    const { error: profileError } = await client.from("profiles").insert({
      id: authUserId,
      full_name: fullName.trim(),
      phone: typeof phone === "string" && phone.trim() !== "" ? phone.trim() : null,
    });
    if (profileError) throw profileError;

    // 3. Staff record with a generated employee code.
    const employeeCode = await nextDocumentNumber("STF");
    const { data: staffRow, error: staffError } = await client
      .from("staff")
      .insert({
        profile_id: authUserId,
        employee_code: employeeCode,
        position: position.trim(),
        status,
        hire_date: typeof hireDate === "string" && hireDate.trim() !== "" ? hireDate : null,
        notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
        created_by: session.userId,
      })
      .select("id")
      .single();
    if (staffError) throw staffError;

    // 4. Role assignments.
    if (roleIds.length > 0) {
      const { error: rolesError } = await client
        .from("staff_roles")
        .insert(roleIds.map((roleId) => ({ staff_id: staffRow.id, role_id: roleId })));
      if (rolesError) throw rolesError;
    }

    await writeAuditLog(session.userId, "staff.create", "staff", staffRow.id, {
      employeeCode,
      email: email.trim(),
      roles: roleIds,
    });

    return { ok: true, message: `Staff account created (${employeeCode}).` };
  } catch (error) {
    // Roll back the auth user so a partial failure leaves no orphan account.
    await service.auth.admin.deleteUser(authUserId).catch(() => {});
    return { ok: false, message: message(error, "Could not create the staff account.") };
  }
}

export async function updateStaffAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.staff.manage)) {
    return { ok: false, message: "You do not have permission to manage staff." };
  }

  const staffId = formData.get("staffId");
  const fullName = formData.get("fullName");
  const phone = formData.get("phone");
  const position = formData.get("position");
  const status = formData.get("status");
  const hireDate = formData.get("hireDate");
  const notes = formData.get("notes");

  if (typeof staffId !== "string" || staffId === "") {
    return { ok: false, message: "Missing staff record." };
  }
  if (typeof fullName !== "string" || fullName.trim().length < 2) {
    return { ok: false, message: "Full name must be at least 2 characters." };
  }
  if (typeof position !== "string" || position.trim().length < 2) {
    return { ok: false, message: "Position must be at least 2 characters." };
  }
  if (typeof status !== "string" || !VALID_STAFF_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid status." };
  }

  const client = await createClient();
  const { data: staffRow, error: fetchError } = await client
    .from("staff")
    .select("id, profile_id")
    .eq("id", staffId)
    .maybeSingle();
  if (fetchError || !staffRow) {
    return { ok: false, message: "Staff record not found." };
  }

  if (staffRow.profile_id === session.userId && status !== "active") {
    return { ok: false, message: "You cannot deactivate your own account." };
  }

  const { error: staffError } = await client
    .from("staff")
    .update({
      position: position.trim(),
      status,
      hire_date: typeof hireDate === "string" && hireDate.trim() !== "" ? hireDate : null,
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
    })
    .eq("id", staffId);
  if (staffError) {
    return { ok: false, message: message(staffError, "Could not update the staff record.") };
  }

  const { error: profileError } = await client
    .from("profiles")
    .update({
      full_name: fullName.trim(),
      phone: typeof phone === "string" && phone.trim() !== "" ? phone.trim() : null,
    })
    .eq("id", staffRow.profile_id);
  if (profileError) {
    return { ok: false, message: message(profileError, "Could not update the profile.") };
  }

  await writeAuditLog(session.userId, "staff.update", "staff", staffId, {
    status,
    position: position.trim(),
  });

  return { ok: true, message: "Staff record saved." };
}

export async function updateStaffRolesAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.staff.manage)) {
    return { ok: false, message: "You do not have permission to manage staff." };
  }

  const staffId = formData.get("staffId");
  const roleIds = formData.getAll("roleIds").filter(
    (value): value is string => typeof value === "string" && value !== "",
  );
  if (typeof staffId !== "string" || staffId === "") {
    return { ok: false, message: "Missing staff record." };
  }

  const client = await createClient();
  const rolesResult = await client.from("roles").select("id");
  const knownRoleIds = new Set((rolesResult.data ?? []).map((r) => r.id));
  if (roleIds.some((id) => !knownRoleIds.has(id))) {
    return { ok: false, message: "One of the chosen roles is invalid." };
  }

  const { error: deleteError } = await client
    .from("staff_roles")
    .delete()
    .eq("staff_id", staffId);
  if (deleteError) {
    return { ok: false, message: "Could not update role assignments." };
  }

  if (roleIds.length > 0) {
    const { error: insertError } = await client
      .from("staff_roles")
      .insert(roleIds.map((roleId) => ({ staff_id: staffId, role_id: roleId })));
    if (insertError) {
      return { ok: false, message: "Could not update role assignments." };
    }
  }

  await writeAuditLog(session.userId, "staff.roles.update", "staff", staffId, {
    roles: roleIds,
  });

  return { ok: true, message: "Role assignments saved." };
}

export async function createRoleAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.staff.manage)) {
    return { ok: false, message: "You do not have permission to manage roles." };
  }

  const code = formData.get("code");
  const name = formData.get("name");
  const description = formData.get("description");

  if (typeof code !== "string" || !/^[a-z][a-z0-9_]*$/.test(code)) {
    return { ok: false, message: "Role code must be lowercase letters, digits and underscores." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Role name must be at least 2 characters." };
  }
  if (typeof description !== "string" || description.trim().length < 2) {
    return { ok: false, message: "Role description must be at least 2 characters." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("roles")
    .insert({
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      is_system: false,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the role.") };
  }

  await writeAuditLog(session.userId, "role.create", "role", data.id, {
    code: code.trim(),
  });

  return { ok: true, message: "Role created. You can now assign permissions to it." };
}

export async function updateRoleAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.staff.manage)) {
    return { ok: false, message: "You do not have permission to manage roles." };
  }

  const roleId = formData.get("roleId");
  const name = formData.get("name");
  const description = formData.get("description");

  if (typeof roleId !== "string" || roleId === "") {
    return { ok: false, message: "Missing role." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Role name must be at least 2 characters." };
  }
  if (typeof description !== "string" || description.trim().length < 2) {
    return { ok: false, message: "Role description must be at least 2 characters." };
  }

  const client = await createClient();
  const { error } = await client
    .from("roles")
    .update({ name: name.trim(), description: description.trim() })
    .eq("id", roleId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the role.") };
  }

  await writeAuditLog(session.userId, "role.update", "role", roleId, {
    name: name.trim(),
  });

  return { ok: true, message: "Role saved." };
}

export async function updateRolePermissionsAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.staff.manage)) {
    return { ok: false, message: "You do not have permission to manage roles." };
  }

  const roleId = formData.get("roleId");
  const permissionIds = formData.getAll("permissionIds").filter(
    (value): value is string => typeof value === "string" && value !== "",
  );
  if (typeof roleId !== "string" || roleId === "") {
    return { ok: false, message: "Missing role." };
  }

  const client = await createClient();
  const permissionsResult = await client.from("permissions").select("id");
  const knownPermissionIds = new Set((permissionsResult.data ?? []).map((p) => p.id));
  if (permissionIds.some((id) => !knownPermissionIds.has(id))) {
    return { ok: false, message: "One of the chosen permissions is invalid." };
  }

  const { error: deleteError } = await client
    .from("role_permissions")
    .delete()
    .eq("role_id", roleId);
  if (deleteError) {
    return { ok: false, message: "Could not update permissions." };
  }

  if (permissionIds.length > 0) {
    const { error: insertError } = await client
      .from("role_permissions")
      .insert(permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })));
    if (insertError) {
      return { ok: false, message: "Could not update permissions." };
    }
  }

  await writeAuditLog(session.userId, "role.permissions.update", "role", roleId, {
    permissionIds,
  });

  return { ok: true, message: "Permissions saved." };
}

function randomPassword(): string {
  const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#";
  let password = "";
  for (let i = 0; i < 16; i += 1) {
    password += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${password}${Math.floor(Math.random() * 90 + 10)}`;
}