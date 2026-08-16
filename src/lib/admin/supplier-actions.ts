"use server";

import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { parseOptionalAmount } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";

const VALID_ENTITY_STATUS = ["active", "inactive"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "A record with the same key already exists.";
    return text;
  }
  return fallback;
}

export async function createSupplierAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.suppliers.create)) {
    return { ok: false, message: "You do not have permission to create suppliers." };
  }

  const name = formData.get("name");
  const contactPerson = formData.get("contactPerson");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const website = formData.get("website");
  const status = formData.get("status");
  const rawTerms = formData.get("paymentTermsDays");
  const notes = formData.get("notes");

  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Supplier name must be at least 2 characters." };
  }
  if (typeof phone !== "string" || phone.trim().length < 9) {
    return { ok: false, message: "Enter a valid phone number." };
  }
  if (typeof status !== "string" || !VALID_ENTITY_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid status." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("suppliers")
    .insert({
      supplier_code: `SUP-${Date.now().toString(36).toUpperCase()}`,
      name: name.trim(),
      contact_person:
        typeof contactPerson === "string" && contactPerson.trim() !== ""
          ? contactPerson.trim()
          : null,
      phone: phone.trim(),
      email: typeof email === "string" && email.trim() !== "" ? email.trim() : null,
      website:
        typeof website === "string" && website.trim() !== "" ? website.trim() : null,
      status,
      payment_terms_days: parseOptionalAmount(rawTerms),
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the supplier.") };
  }

  await writeAuditLog(session.userId, "create", "supplier", data.id, {
    name: name.trim(),
  });

  return { ok: true, message: "Supplier created." };
}

export async function updateSupplierAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.suppliers.update)) {
    return { ok: false, message: "You do not have permission to update suppliers." };
  }

  const supplierId = formData.get("supplierId");
  const name = formData.get("name");
  const contactPerson = formData.get("contactPerson");
  const phone = formData.get("phone");
  const email = formData.get("email");
  const website = formData.get("website");
  const status = formData.get("status");
  const rawTerms = formData.get("paymentTermsDays");
  const notes = formData.get("notes");

  if (typeof supplierId !== "string" || supplierId === "") {
    return { ok: false, message: "Missing supplier." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Supplier name must be at least 2 characters." };
  }
  if (typeof phone !== "string" || phone.trim().length < 9) {
    return { ok: false, message: "Enter a valid phone number." };
  }
  if (typeof status !== "string" || !VALID_ENTITY_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid status." };
  }

  const client = await createClient();
  const { error } = await client
    .from("suppliers")
    .update({
      name: name.trim(),
      contact_person:
        typeof contactPerson === "string" && contactPerson.trim() !== ""
          ? contactPerson.trim()
          : null,
      phone: phone.trim(),
      email: typeof email === "string" && email.trim() !== "" ? email.trim() : null,
      website:
        typeof website === "string" && website.trim() !== "" ? website.trim() : null,
      status,
      payment_terms_days: parseOptionalAmount(rawTerms),
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
    })
    .eq("id", supplierId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the supplier.") };
  }

  await writeAuditLog(session.userId, "update", "supplier", supplierId, {
    status,
  });

  return { ok: true, message: "Supplier saved." };
}

export async function createSupplierProductAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.suppliers.create)) {
    return { ok: false, message: "You do not have permission to link variants." };
  }

  const supplierId = formData.get("supplierId");
  const variantId = formData.get("variantId");
  const supplierSku = formData.get("supplierSku");
  const supplierProductName = formData.get("supplierProductName");
  const lastCost = parseOptionalAmount(formData.get("lastCost"));
  const preferred = formData.get("preferred") === "on";
  const rawLeadTime = formData.get("leadTimeDays");
  const rawMoq = parseOptionalAmount(formData.get("minimumOrderQuantity"));

  if (typeof supplierId !== "string" || supplierId === "") {
    return { ok: false, message: "Missing supplier." };
  }
  if (typeof variantId !== "string" || variantId === "") {
    return { ok: false, message: "Select a variant." };
  }

  const client = await createClient();

  if (preferred) {
    const { error: unsetError } = await client
      .from("supplier_products")
      .update({ preferred_supplier: false })
      .eq("variant_id", variantId);
    if (unsetError) {
      return {
        ok: false,
        message: "Could not update existing supplier links (needs the suppliers.update permission).",
      };
    }
  }

  const { data, error } = await client
    .from("supplier_products")
    .insert({
      supplier_id: supplierId,
      variant_id: variantId,
      supplier_sku:
        typeof supplierSku === "string" && supplierSku.trim() !== ""
          ? supplierSku.trim()
          : null,
      supplier_product_name:
        typeof supplierProductName === "string" && supplierProductName.trim() !== ""
          ? supplierProductName.trim()
          : null,
      last_cost: lastCost,
      preferred_supplier: preferred,
      lead_time_days:
        typeof rawLeadTime === "string" && rawLeadTime.trim() !== ""
          ? Number(rawLeadTime)
          : null,
      minimum_order_quantity: rawMoq,
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not link the variant.") };
  }

  await writeAuditLog(session.userId, "create", "supplier_product", data.id, {
    supplierId,
    variantId,
    preferredSupplier: preferred,
  });

  return { ok: true, message: "Variant linked to supplier." };
}