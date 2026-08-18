"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { nextDocumentNumber } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  GENDERS,
  PAYROLL_PERIOD_STATUSES,
  SALARY_COMPONENT_TYPES,
} from "@/lib/admin/hr-constants";
import { createClient } from "@/lib/supabase/server";
import { normalizeGhanaPhone } from "@/lib/format";

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) {
      return "A record with the same name or code already exists.";
    }
    if (text.includes("violates foreign key")) return "A selected reference does not exist.";
    return text;
  }
  return fallback;
}

function trimmed(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function optionalTrimmed(value: FormDataEntryValue | null): string | null {
  const text = trimmed(value);
  return text === "" ? null : text;
}

function isValidOption(value: FormDataEntryValue | null, allowed: readonly string[]): value is string {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function parseDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const parsed = new Date(`${value.trim()}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return value.trim();
}

function parseGhanaMobileNumber(value: FormDataEntryValue | null): string | null {
  const text = trimmed(value);
  if (text === "") return null;
  const normalized = normalizeGhanaPhone(text);
  return /^0\d{9}$/.test(normalized) ? normalized : null;
}

function parseAmount(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export async function createDepartmentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.create)) {
    return { ok: false, message: "You do not have permission to create departments." };
  }

  const name = trimmed(formData.get("name"));
  const description = optionalTrimmed(formData.get("description"));

  if (name.length < 2) {
    return { ok: false, message: "Enter a department name of at least 2 characters." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("departments")
    .insert({ name, description, created_by: session.userId, updated_by: session.userId })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the department.") };
  }

  await writeAuditLog(session.userId, "create", "department", data.id, { name });
  revalidatePath("/admin/hr/departments");
  return { ok: true, message: "Department created." };
}

export async function updateDepartmentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to edit departments." };
  }

  const departmentId = formData.get("departmentId");
  if (typeof departmentId !== "string" || departmentId === "") {
    return { ok: false, message: "Missing department." };
  }

  const name = trimmed(formData.get("name"));
  const description = optionalTrimmed(formData.get("description"));

  if (name.length < 2) {
    return { ok: false, message: "Enter a department name of at least 2 characters." };
  }

  const client = await createClient();
  const { error } = await client
    .from("departments")
    .update({ name, description, updated_by: session.userId })
    .eq("id", departmentId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the department.") };
  }

  await writeAuditLog(session.userId, "update", "department", departmentId, { name });
  revalidatePath("/admin/hr/departments");
  return { ok: true, message: "Department updated." };
}

export async function setDepartmentStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to change department status." };
  }

  const departmentId = formData.get("departmentId");
  const target = formData.get("isActive");
  if (typeof departmentId !== "string" || departmentId === "") {
    return { ok: false, message: "Missing department." };
  }
  if (target !== "true" && target !== "false") {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { data: current, error: fetchError } = await client
    .from("departments")
    .select("id, name, is_active")
    .eq("id", departmentId)
    .maybeSingle();
  if (fetchError || !current) {
    return { ok: false, message: "Department not found." };
  }
  const targetActive = target === "true";
  if (current.is_active === targetActive) {
    return { ok: false, message: `The department is already ${targetActive ? "active" : "inactive"}.` };
  }

  const { error } = await client
    .from("departments")
    .update({ is_active: targetActive, updated_by: session.userId })
    .eq("id", departmentId);
  if (error) {
    return { ok: false, message: message(error, "Could not update the department status.") };
  }

  await writeAuditLog(
    session.userId,
    targetActive ? "activate" : "deactivate",
    "department",
    departmentId,
    { name: current.name, from: current.is_active, to: targetActive },
  );
  revalidatePath("/admin/hr/departments");
  return {
    ok: true,
    message: targetActive ? "Department activated." : "Department deactivated.",
  };
}

// ---------------------------------------------------------------------------
// Employees
// ---------------------------------------------------------------------------

function validateEmployeeForm(formData: FormData): string | null {
  const firstName = trimmed(formData.get("firstName"));
  const lastName = trimmed(formData.get("lastName"));
  const email = optionalTrimmed(formData.get("email"));
  const phone = parseGhanaMobileNumber(formData.get("phone"));
  const hireDate = parseDate(formData.get("hireDate"));

  if (firstName.length < 2) return "Enter a first name of at least 2 characters.";
  if (lastName.length < 2) return "Enter a last name of at least 2 characters.";
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Enter a valid email address.";
  }
  if (phone === null && trimmed(formData.get("phone")) !== "") {
    return "Enter a valid Ghana mobile number (e.g. 0244 123 456).";
  }
  if (hireDate === null) return "Enter a valid hire date.";
  if (!isValidOption(formData.get("employmentType"), EMPLOYMENT_TYPES)) {
    return "Choose a valid employment type.";
  }
  if (!isValidOption(formData.get("employmentStatus"), EMPLOYEE_STATUSES)) {
    return "Choose a valid employment status.";
  }
  if (!isValidOption(formData.get("gender"), GENDERS)) {
    return "Choose a valid gender.";
  }
  return null;
}

export async function createEmployeeAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.create)) {
    return { ok: false, message: "You do not have permission to create employees." };
  }

  const validationError = validateEmployeeForm(formData);
  if (validationError) return { ok: false, message: validationError };

  const phone = parseGhanaMobileNumber(formData.get("phone"));
  const hireDate = parseDate(formData.get("hireDate"));
  const departmentId = optionalTrimmed(formData.get("departmentId"));
  const structureId = optionalTrimmed(formData.get("structureId"));
  const staffId = optionalTrimmed(formData.get("staffId"));
  const dateOfBirth = parseDate(formData.get("dateOfBirth"));

  const client = await createClient();
  const employeeCode = await nextDocumentNumber("EMP");
  const { data, error } = await client
    .from("employees")
    .insert({
      employee_code: employeeCode,
      first_name: trimmed(formData.get("firstName")),
      last_name: trimmed(formData.get("lastName")),
      email: optionalTrimmed(formData.get("email")),
      phone,
      gender: formData.get("gender"),
      date_of_birth: dateOfBirth,
      hire_date: hireDate,
      employment_type: formData.get("employmentType"),
      employment_status: formData.get("employmentStatus"),
      job_title: optionalTrimmed(formData.get("jobTitle")),
      social_security_number: optionalTrimmed(formData.get("socialSecurityNumber")),
      department_id: departmentId,
      structure_id: structureId,
      staff_id: staffId,
      emergency_contact_name: optionalTrimmed(formData.get("emergencyContactName")),
      emergency_contact_phone: optionalTrimmed(formData.get("emergencyContactPhone")),
      notes: optionalTrimmed(formData.get("notes")),
      created_by: session.userId,
      updated_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the employee.") };
  }

  await writeAuditLog(session.userId, "create", "employee", data.id, {
    employeeCode,
    employmentType: formData.get("employmentType"),
    employmentStatus: formData.get("employmentStatus"),
  });

  redirect(`/admin/hr/employees/${data.id}`);
}

export async function updateEmployeeAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to edit employees." };
  }

  const employeeId = formData.get("employeeId");
  if (typeof employeeId !== "string" || employeeId === "") {
    return { ok: false, message: "Missing employee." };
  }

  const validationError = validateEmployeeForm(formData);
  if (validationError) return { ok: false, message: validationError };

  const phone = parseGhanaMobileNumber(formData.get("phone"));
  const hireDate = parseDate(formData.get("hireDate"));
  const departmentId = optionalTrimmed(formData.get("departmentId"));
  const structureId = optionalTrimmed(formData.get("structureId"));
  const staffId = optionalTrimmed(formData.get("staffId"));
  const dateOfBirth = parseDate(formData.get("dateOfBirth"));

  const client = await createClient();
  const { error } = await client
    .from("employees")
    .update({
      first_name: trimmed(formData.get("firstName")),
      last_name: trimmed(formData.get("lastName")),
      email: optionalTrimmed(formData.get("email")),
      phone,
      gender: formData.get("gender"),
      date_of_birth: dateOfBirth,
      hire_date: hireDate,
      employment_type: formData.get("employmentType"),
      employment_status: formData.get("employmentStatus"),
      job_title: optionalTrimmed(formData.get("jobTitle")),
      social_security_number: optionalTrimmed(formData.get("socialSecurityNumber")),
      department_id: departmentId,
      structure_id: structureId,
      staff_id: staffId,
      emergency_contact_name: optionalTrimmed(formData.get("emergencyContactName")),
      emergency_contact_phone: optionalTrimmed(formData.get("emergencyContactPhone")),
      notes: optionalTrimmed(formData.get("notes")),
      updated_by: session.userId,
    })
    .eq("id", employeeId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the employee.") };
  }

  await writeAuditLog(session.userId, "update", "employee", employeeId, {
    employmentType: formData.get("employmentType"),
    employmentStatus: formData.get("employmentStatus"),
  });

  redirect(`/admin/hr/employees/${employeeId}`);
}

export async function setEmployeeStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to change employee status." };
  }

  const employeeId = formData.get("employeeId");
  const target = formData.get("employmentStatus");
  if (typeof employeeId !== "string" || employeeId === "") {
    return { ok: false, message: "Missing employee." };
  }
  if (!isValidOption(target, EMPLOYEE_STATUSES)) {
    return { ok: false, message: "Invalid employment status." };
  }

  const client = await createClient();
  const { data: current, error: fetchError } = await client
    .from("employees")
    .select("id, employee_code, employment_status")
    .eq("id", employeeId)
    .maybeSingle();
  if (fetchError || !current) {
    return { ok: false, message: "Employee not found." };
  }
  if (current.employment_status === target) {
    return { ok: false, message: `The employee is already ${target}.` };
  }

  const { error } = await client
    .from("employees")
    .update({ employment_status: target, updated_by: session.userId })
    .eq("id", employeeId);
  if (error) {
    return { ok: false, message: message(error, "Could not update the employee status.") };
  }

  await writeAuditLog(session.userId, "update", "employee", employeeId, {
    employeeCode: current.employee_code,
    field: "employment_status",
    from: current.employment_status,
    to: target,
  });
  revalidatePath("/admin/hr/employees");
  revalidatePath(`/admin/hr/employees/${employeeId}`);
  return { ok: true, message: `Employee marked as ${target.replaceAll("_", " ")}.` };
}

// ---------------------------------------------------------------------------
// Salary components
// ---------------------------------------------------------------------------

export async function createSalaryComponentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.create)) {
    return { ok: false, message: "You do not have permission to create salary components." };
  }

  const name = trimmed(formData.get("name"));
  const description = optionalTrimmed(formData.get("description"));

  if (name.length < 2) {
    return { ok: false, message: "Enter a component name of at least 2 characters." };
  }
  if (!isValidOption(formData.get("componentType"), SALARY_COMPONENT_TYPES)) {
    return { ok: false, message: "Choose a valid component type." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("salary_components")
    .insert({
      name,
      component_type: formData.get("componentType"),
      description,
      created_by: session.userId,
      updated_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the salary component.") };
  }

  await writeAuditLog(session.userId, "create", "salary_component", data.id, {
    name,
    componentType: formData.get("componentType"),
  });
  revalidatePath("/admin/hr/salary-components");
  return { ok: true, message: "Salary component created." };
}

export async function updateSalaryComponentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to edit salary components." };
  }

  const componentId = formData.get("componentId");
  if (typeof componentId !== "string" || componentId === "") {
    return { ok: false, message: "Missing salary component." };
  }

  const name = trimmed(formData.get("name"));
  const description = optionalTrimmed(formData.get("description"));

  if (name.length < 2) {
    return { ok: false, message: "Enter a component name of at least 2 characters." };
  }
  if (!isValidOption(formData.get("componentType"), SALARY_COMPONENT_TYPES)) {
    return { ok: false, message: "Choose a valid component type." };
  }

  const client = await createClient();
  const { error } = await client
    .from("salary_components")
    .update({
      name,
      component_type: formData.get("componentType"),
      description,
      updated_by: session.userId,
    })
    .eq("id", componentId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the salary component.") };
  }

  await writeAuditLog(session.userId, "update", "salary_component", componentId, {
    name,
    componentType: formData.get("componentType"),
  });
  revalidatePath("/admin/hr/salary-components");
  return { ok: true, message: "Salary component updated." };
}

export async function setSalaryComponentStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to change salary component status." };
  }

  const componentId = formData.get("componentId");
  const target = formData.get("isActive");
  if (typeof componentId !== "string" || componentId === "") {
    return { ok: false, message: "Missing salary component." };
  }
  if (target !== "true" && target !== "false") {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { data: current, error: fetchError } = await client
    .from("salary_components")
    .select("id, name, is_active")
    .eq("id", componentId)
    .maybeSingle();
  if (fetchError || !current) {
    return { ok: false, message: "Salary component not found." };
  }
  const targetActive = target === "true";
  if (current.is_active === targetActive) {
    return { ok: false, message: `The component is already ${targetActive ? "active" : "inactive"}.` };
  }

  const { error } = await client
    .from("salary_components")
    .update({ is_active: targetActive, updated_by: session.userId })
    .eq("id", componentId);
  if (error) {
    return { ok: false, message: message(error, "Could not update the component status.") };
  }

  await writeAuditLog(
    session.userId,
    targetActive ? "activate" : "deactivate",
    "salary_component",
    componentId,
    { name: current.name, from: current.is_active, to: targetActive },
  );
  revalidatePath("/admin/hr/salary-components");
  return {
    ok: true,
    message: targetActive ? "Salary component activated." : "Salary component deactivated.",
  };
}

// ---------------------------------------------------------------------------
// Salary structures
// ---------------------------------------------------------------------------

export async function createSalaryStructureAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.create)) {
    return { ok: false, message: "You do not have permission to create salary structures." };
  }

  const name = trimmed(formData.get("name"));
  const description = optionalTrimmed(formData.get("description"));

  if (name.length < 2) {
    return { ok: false, message: "Enter a structure name of at least 2 characters." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("salary_structures")
    .insert({ name, description, created_by: session.userId, updated_by: session.userId })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the salary structure.") };
  }

  await writeAuditLog(session.userId, "create", "salary_structure", data.id, { name });
  redirect(`/admin/hr/salary-structures/${data.id}`);
}

export async function updateSalaryStructureAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to edit salary structures." };
  }

  const structureId = formData.get("structureId");
  if (typeof structureId !== "string" || structureId === "") {
    return { ok: false, message: "Missing salary structure." };
  }

  const name = trimmed(formData.get("name"));
  const description = optionalTrimmed(formData.get("description"));

  if (name.length < 2) {
    return { ok: false, message: "Enter a structure name of at least 2 characters." };
  }

  const client = await createClient();
  const { error } = await client
    .from("salary_structures")
    .update({ name, description, updated_by: session.userId })
    .eq("id", structureId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the salary structure.") };
  }

  await writeAuditLog(session.userId, "update", "salary_structure", structureId, { name });
  redirect(`/admin/hr/salary-structures/${structureId}`);
}

export async function setSalaryStructureStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to change salary structure status." };
  }

  const structureId = formData.get("structureId");
  const target = formData.get("isActive");
  if (typeof structureId !== "string" || structureId === "") {
    return { ok: false, message: "Missing salary structure." };
  }
  if (target !== "true" && target !== "false") {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { data: current, error: fetchError } = await client
    .from("salary_structures")
    .select("id, name, is_active")
    .eq("id", structureId)
    .maybeSingle();
  if (fetchError || !current) {
    return { ok: false, message: "Salary structure not found." };
  }
  const targetActive = target === "true";
  if (current.is_active === targetActive) {
    return { ok: false, message: `The structure is already ${targetActive ? "active" : "inactive"}.` };
  }

  const { error } = await client
    .from("salary_structures")
    .update({ is_active: targetActive, updated_by: session.userId })
    .eq("id", structureId);
  if (error) {
    return { ok: false, message: message(error, "Could not update the structure status.") };
  }

  await writeAuditLog(
    session.userId,
    targetActive ? "activate" : "deactivate",
    "salary_structure",
    structureId,
    { name: current.name, from: current.is_active, to: targetActive },
  );
  revalidatePath("/admin/hr/salary-structures");
  revalidatePath(`/admin/hr/salary-structures/${structureId}`);
  return {
    ok: true,
    message: targetActive ? "Salary structure activated." : "Salary structure deactivated.",
  };
}

export async function addStructureComponentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to manage salary structure components." };
  }

  const structureId = formData.get("structureId");
  const componentId = formData.get("componentId");
  const amount = parseAmount(formData.get("amount"));

  if (typeof structureId !== "string" || structureId === "") {
    return { ok: false, message: "Missing salary structure." };
  }
  if (typeof componentId !== "string" || componentId === "") {
    return { ok: false, message: "Choose a salary component." };
  }
  if (amount === null) {
    return { ok: false, message: "Enter a valid amount of zero or more." };
  }

  const client = await createClient();
  const { data: structure } = await client
    .from("salary_structures")
    .select("id, name")
    .eq("id", structureId)
    .maybeSingle();
  if (!structure) return { ok: false, message: "Salary structure not found." };

  const { data: component } = await client
    .from("salary_components")
    .select("id, name, is_active")
    .eq("id", componentId)
    .maybeSingle();
  if (!component || !component.is_active) {
    return { ok: false, message: "Choose an active salary component." };
  }

  const { data: existing } = await client
    .from("salary_structure_components")
    .select("id")
    .eq("structure_id", structureId)
    .eq("component_id", componentId)
    .maybeSingle();
  if (existing) {
    return { ok: false, message: "That component is already in this structure." };
  }

  const { error } = await client.from("salary_structure_components").insert({
    structure_id: structureId,
    component_id: componentId,
    amount,
    created_by: session.userId,
  });
  if (error) {
    return { ok: false, message: message(error, "Could not add the component.") };
  }

  await writeAuditLog(session.userId, "update", "salary_structure", structureId, {
    action: "add_component",
    structureName: structure.name,
    componentName: component.name,
  });
  revalidatePath(`/admin/hr/salary-structures/${structureId}`);
  return { ok: true, message: "Component added to the salary structure." };
}

export async function removeStructureComponentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to manage salary structure components." };
  }

  const structureId = formData.get("structureId");
  const componentId = formData.get("componentId");
  if (typeof structureId !== "string" || structureId === "") {
    return { ok: false, message: "Missing salary structure." };
  }
  if (typeof componentId !== "string" || componentId === "") {
    return { ok: false, message: "Missing salary component." };
  }

  const client = await createClient();
  const { data: structure } = await client
    .from("salary_structures")
    .select("id, name")
    .eq("id", structureId)
    .maybeSingle();
  if (!structure) return { ok: false, message: "Salary structure not found." };

  const { data: component } = await client
    .from("salary_components")
    .select("id, name")
    .eq("id", componentId)
    .maybeSingle();

  const { error } = await client
    .from("salary_structure_components")
    .delete()
    .eq("structure_id", structureId)
    .eq("component_id", componentId);
  if (error) {
    return { ok: false, message: message(error, "Could not remove the component.") };
  }

  await writeAuditLog(session.userId, "update", "salary_structure", structureId, {
    action: "remove_component",
    structureName: structure.name,
    componentName: component?.name ?? null,
  });
  revalidatePath(`/admin/hr/salary-structures/${structureId}`);
  return { ok: true, message: "Component removed from the salary structure." };
}

// ---------------------------------------------------------------------------
// Payroll periods
// ---------------------------------------------------------------------------

function validatePayrollPeriodForm(formData: FormData): string | null {
  const name = trimmed(formData.get("name"));
  const startDate = parseDate(formData.get("startDate"));
  const endDate = parseDate(formData.get("endDate"));

  if (name.length < 2) return "Enter a period name of at least 2 characters.";
  if (startDate === null) return "Enter a valid start date.";
  if (endDate === null) return "Enter a valid end date.";
  if (endDate < startDate) return "The end date cannot be before the start date.";
  return null;
}

export async function createPayrollPeriodAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.create)) {
    return { ok: false, message: "You do not have permission to create payroll periods." };
  }

  const validationError = validatePayrollPeriodForm(formData);
  if (validationError) return { ok: false, message: validationError };

  const client = await createClient();
  const { data, error } = await client
    .from("payroll_periods")
    .insert({
      name: trimmed(formData.get("name")),
      start_date: parseDate(formData.get("startDate")),
      end_date: parseDate(formData.get("endDate")),
      notes: optionalTrimmed(formData.get("notes")),
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the payroll period.") };
  }

  await writeAuditLog(session.userId, "create", "payroll_period", data.id, {
    name: trimmed(formData.get("name")),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  revalidatePath("/admin/hr/payroll-periods");
  return { ok: true, message: "Payroll period created." };
}

export async function updatePayrollPeriodAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to edit payroll periods." };
  }

  const periodId = formData.get("periodId");
  if (typeof periodId !== "string" || periodId === "") {
    return { ok: false, message: "Missing payroll period." };
  }

  const validationError = validatePayrollPeriodForm(formData);
  if (validationError) return { ok: false, message: validationError };

  const client = await createClient();
  const { error } = await client
    .from("payroll_periods")
    .update({
      name: trimmed(formData.get("name")),
      start_date: parseDate(formData.get("startDate")),
      end_date: parseDate(formData.get("endDate")),
      notes: optionalTrimmed(formData.get("notes")),
    })
    .eq("id", periodId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the payroll period.") };
  }

  await writeAuditLog(session.userId, "update", "payroll_period", periodId, {
    name: trimmed(formData.get("name")),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
  });
  revalidatePath("/admin/hr/payroll-periods");
  return { ok: true, message: "Payroll period updated." };
}

export async function setPayrollPeriodStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to change payroll period status." };
  }

  const periodId = formData.get("periodId");
  const target = formData.get("status");
  if (typeof periodId !== "string" || periodId === "") {
    return { ok: false, message: "Missing payroll period." };
  }
  if (!isValidOption(target, PAYROLL_PERIOD_STATUSES)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { data: current, error: fetchError } = await client
    .from("payroll_periods")
    .select("id, name, status")
    .eq("id", periodId)
    .maybeSingle();
  if (fetchError || !current) {
    return { ok: false, message: "Payroll period not found." };
  }
  if (current.status === target) {
    return { ok: false, message: `The period is already ${target}.` };
  }

  const { error } = await client
    .from("payroll_periods")
    .update({ status: target })
    .eq("id", periodId);
  if (error) {
    return { ok: false, message: message(error, "Could not update the period status.") };
  }

  await writeAuditLog(session.userId, "update", "payroll_period", periodId, {
    name: current.name,
    from: current.status,
    to: target,
  });
  revalidatePath("/admin/hr/payroll-periods");
  return { ok: true, message: `Payroll period marked as ${target}.` };
}

// ---------------------------------------------------------------------------
// Income tax slabs
// ---------------------------------------------------------------------------

function validateTaxSlabForm(formData: FormData): string | null {
  const name = trimmed(formData.get("name"));
  const lowerLimit = parseAmount(formData.get("lowerLimit"));
  const upperLimit = parseAmount(formData.get("upperLimit"));
  const rate = parseAmount(formData.get("rate"));

  if (name.length < 2) return "Enter a slab name of at least 2 characters.";
  if (lowerLimit === null) return "Enter a valid lower limit of zero or more.";
  if (upperLimit !== null && upperLimit <= lowerLimit) {
    return "The upper limit must be greater than the lower limit.";
  }
  if (rate === null || rate > 100) return "Enter a valid rate between 0 and 100.";
  return null;
}

export async function createIncomeTaxSlabAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.create)) {
    return { ok: false, message: "You do not have permission to create tax slabs." };
  }

  const validationError = validateTaxSlabForm(formData);
  if (validationError) return { ok: false, message: validationError };

  const client = await createClient();
  const { data, error } = await client
    .from("income_tax_slabs")
    .insert({
      name: trimmed(formData.get("name")),
      lower_limit: parseAmount(formData.get("lowerLimit")),
      upper_limit: parseAmount(formData.get("upperLimit")),
      rate: parseAmount(formData.get("rate")),
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the tax slab.") };
  }

  await writeAuditLog(session.userId, "create", "income_tax_slab", data.id, {
    name: trimmed(formData.get("name")),
    rate: formData.get("rate"),
  });
  revalidatePath("/admin/hr/tax-slabs");
  return { ok: true, message: "Income tax slab created." };
}

export async function updateIncomeTaxSlabAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to edit tax slabs." };
  }

  const slabId = formData.get("slabId");
  if (typeof slabId !== "string" || slabId === "") {
    return { ok: false, message: "Missing tax slab." };
  }

  const validationError = validateTaxSlabForm(formData);
  if (validationError) return { ok: false, message: validationError };

  const client = await createClient();
  const { error } = await client
    .from("income_tax_slabs")
    .update({
      name: trimmed(formData.get("name")),
      lower_limit: parseAmount(formData.get("lowerLimit")),
      upper_limit: parseAmount(formData.get("upperLimit")),
      rate: parseAmount(formData.get("rate")),
    })
    .eq("id", slabId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the tax slab.") };
  }

  await writeAuditLog(session.userId, "update", "income_tax_slab", slabId, {
    name: trimmed(formData.get("name")),
    rate: formData.get("rate"),
  });
  revalidatePath("/admin/hr/tax-slabs");
  return { ok: true, message: "Income tax slab updated." };
}

export async function setIncomeTaxSlabStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.hr.update)) {
    return { ok: false, message: "You do not have permission to change tax slab status." };
  }

  const slabId = formData.get("slabId");
  const target = formData.get("isActive");
  if (typeof slabId !== "string" || slabId === "") {
    return { ok: false, message: "Missing tax slab." };
  }
  if (target !== "true" && target !== "false") {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { data: current, error: fetchError } = await client
    .from("income_tax_slabs")
    .select("id, name, is_active")
    .eq("id", slabId)
    .maybeSingle();
  if (fetchError || !current) {
    return { ok: false, message: "Tax slab not found." };
  }
  const targetActive = target === "true";
  if (current.is_active === targetActive) {
    return { ok: false, message: `The slab is already ${targetActive ? "active" : "inactive"}.` };
  }

  const { error } = await client
    .from("income_tax_slabs")
    .update({ is_active: targetActive })
    .eq("id", slabId);
  if (error) {
    return { ok: false, message: message(error, "Could not update the slab status.") };
  }

  await writeAuditLog(
    session.userId,
    targetActive ? "activate" : "deactivate",
    "income_tax_slab",
    slabId,
    { name: current.name, from: current.is_active, to: targetActive },
  );
  revalidatePath("/admin/hr/tax-slabs");
  return {
    ok: true,
    message: targetActive ? "Tax slab activated." : "Tax slab deactivated.",
  };
}