"use server";

import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";

const VALID_CUSTOMER_STATUS = ["active", "inactive", "blocked"];
const VALID_CUSTOMER_TYPES = ["individual", "business"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: string }).message);
  }
  return fallback;
}

export async function updateCustomerAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.customers.update)) {
    return { ok: false, message: "You do not have permission to update customers." };
  }

  const customerId = formData.get("customerId");
  const firstName = formData.get("firstName");
  const lastName = formData.get("lastName");
  const businessName = formData.get("businessName");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const tinNumber = formData.get("tinNumber");
  const customerType = formData.get("customerType");
  const status = formData.get("status");
  const notes = formData.get("notes");

  if (typeof customerId !== "string" || customerId === "") {
    return { ok: false, message: "Missing customer." };
  }
  if (typeof firstName !== "string" || firstName.trim() === "") {
    return { ok: false, message: "First name is required." };
  }
  if (typeof lastName !== "string" || lastName.trim() === "") {
    return { ok: false, message: "Last name is required." };
  }
  if (typeof phone !== "string" || phone.trim().length < 9) {
    return { ok: false, message: "Enter a valid phone number." };
  }
  if (typeof customerType !== "string" || !VALID_CUSTOMER_TYPES.includes(customerType)) {
    return { ok: false, message: "Choose a valid customer type." };
  }
  if (typeof status !== "string" || !VALID_CUSTOMER_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid status." };
  }
  if (typeof email === "string" && email.trim() !== "" && !email.includes("@")) {
    return { ok: false, message: "Enter a valid email address." };
  }

  const client = await createClient();
  const { error } = await client
    .from("customers")
    .update({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      business_name:
        typeof businessName === "string" && businessName.trim() !== ""
          ? businessName.trim()
          : null,
      phone: phone.trim(),
      email: typeof email === "string" && email.trim() !== "" ? email.trim() : null,
      tin_number:
        typeof tinNumber === "string" && tinNumber.trim() !== ""
          ? tinNumber.trim()
          : null,
      customer_type: customerType,
      status,
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
    })
    .eq("id", customerId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the customer.") };
  }

  await writeAuditLog(session.userId, "update", "customer", customerId, {
    status,
  });

  return { ok: true, message: "Customer saved." };
}