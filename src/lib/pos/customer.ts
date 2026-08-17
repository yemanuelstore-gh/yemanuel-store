"use server";

import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { nextDocumentNumber } from "@/lib/admin/doc-numbers";
import { createClient } from "@/lib/supabase/server";
import { normalizeGhanaPhone } from "@/lib/format";
import { isNonEmpty, isValidFullName, isValidGhanaPhone } from "@/lib/validation";
import type { PosCustomerOption } from "./types";

type CustomerRow = {
  id: string;
  customer_code: string;
  first_name: string;
  last_name: string;
  business_name: string | null;
  phone: string;
  email: string | null;
};

function toOption(row: CustomerRow): PosCustomerOption {
  return {
    id: row.id,
    customerCode: row.customer_code,
    name: row.business_name?.trim()
      ? `${row.first_name} ${row.last_name} (${row.business_name})`
      : `${row.first_name} ${row.last_name}`,
    phone: row.phone,
    email: row.email,
  };
}

/**
 * Quick customer lookup for the register. Gated by customers.read through
 * both the permission check and the RLS policy on the authenticated client.
 */
export async function searchPosCustomersAction(q: string): Promise<PosCustomerOption[]> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.customers.read)) return [];

  const client = await createClient();
  const term = q.trim();
  let query = client
    .from("customers")
    .select("id, customer_code, first_name, last_name, business_name, phone, email")
    .eq("status", "active");

  if (term !== "") {
    const like = `%${term}%`;
    query = query.or(
      `first_name.ilike.${like},last_name.ilike.${like},customer_code.ilike.${like},phone.ilike.${like},business_name.ilike.${like}`,
    );
  }

  const { data } = await query
    .order("created_at", { ascending: false })
    .limit(8);

  return ((data ?? []) as unknown as CustomerRow[]).map(toOption);
}

/**
 * Create a customer from the register (e.g. a walk-in who wants an account).
 * Requires customers.create. Phone numbers are normalised and checked first
 * so the same person is never created twice.
 */
export async function createPosCustomerAction(
  prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.customers.create)) {
    return { ok: false, message: "You do not have the customers.create permission." };
  }

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!isNonEmpty(firstName) || !isValidFullName(firstName)) {
    return { ok: false, message: "Enter a valid first name." };
  }
  if (!isNonEmpty(lastName) || !isValidFullName(lastName)) {
    return { ok: false, message: "Enter a valid last name." };
  }
  if (!isValidGhanaPhone(phone)) {
    return { ok: false, message: "Enter a valid Ghana phone number (e.g. 024 412 3456)." };
  }

  const normalizedPhone = normalizeGhanaPhone(phone);
  const client = await createClient();

  const existing = await client
    .from("customers")
    .select("id")
    .eq("phone", normalizedPhone)
    .maybeSingle();
  if (existing.data) {
    return {
      ok: false,
      message: "A customer with this phone number already exists.",
    };
  }

  const customerCode = await nextDocumentNumber("CUS");

  const { data, error } = await client
    .from("customers")
    .insert({
      customer_code: customerCode,
      customer_type: "individual",
      first_name: firstName,
      last_name: lastName,
      phone: normalizedPhone,
      status: "active",
      created_by: session.userId,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: "Could not create the customer. Please try again." };
  }

  await writeAuditLog(session.userId, "create", "customer", data.id as string, {
    customerCode,
    name: `${firstName} ${lastName}`,
    phone: normalizedPhone,
  });

  return { ok: true, message: "Customer created — select them from the search results." };
}