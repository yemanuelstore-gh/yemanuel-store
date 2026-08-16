"use server";

import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { slugify, parseOptionalAmount } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";

const VALID_LOCATION_TYPES = ["store", "warehouse"];
const VALID_METHOD_KINDS = ["delivery", "pickup"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "A record with the same code or name already exists.";
    if (text.includes("violates foreign key")) return "A selected reference does not exist.";
    return text;
  }
  return fallback;
}

export async function createLocationAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.settings.manage)) {
    return { ok: false, message: "You do not have the settings.manage permission." };
  }

  const name = formData.get("name");
  const locationType = formData.get("locationType");
  const regionId = formData.get("regionId");
  const city = formData.get("city");
  const addressLine1 = formData.get("addressLine1");
  const addressLine2 = formData.get("addressLine2");
  const phone = formData.get("phone");

  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Enter a location name of at least 2 characters." };
  }
  if (typeof locationType !== "string" || !VALID_LOCATION_TYPES.includes(locationType)) {
    return { ok: false, message: "Choose a valid location type." };
  }
  if (typeof regionId !== "string" || regionId === "") {
    return { ok: false, message: "A region is required." };
  }
  if (typeof city !== "string" || city.trim() === "") {
    return { ok: false, message: "The city is required." };
  }
  if (typeof addressLine1 !== "string" || addressLine1.trim() === "") {
    return { ok: false, message: "The address line is required." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("locations")
    .insert({
      code: slugify(name.trim()).toUpperCase(),
      name: name.trim(),
      location_type: locationType,
      region_id: regionId,
      city: city.trim(),
      address_line_1: addressLine1.trim(),
      address_line_2:
        typeof addressLine2 === "string" && addressLine2.trim() !== ""
          ? addressLine2.trim()
          : null,
      phone: typeof phone === "string" && phone.trim() !== "" ? phone.trim() : null,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the location.") };
  }

  await writeAuditLog(session.userId, "create", "location", data.id, { name: name.trim() });
  revalidatePath("/admin/settings");

  return { ok: true, message: "Location created." };
}

export async function updateLocationStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.settings.manage)) {
    return { ok: false, message: "You do not have the settings.manage permission." };
  }

  const locationId = formData.get("locationId");
  const status = formData.get("status");
  if (typeof locationId !== "string" || locationId === "") {
    return { ok: false, message: "Missing location." };
  }
  if (typeof status !== "string" || !["active", "inactive"].includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { error } = await client.from("locations").update({ status }).eq("id", locationId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the location.") };
  }

  await writeAuditLog(session.userId, "update", "location", locationId, { status });
  revalidatePath("/admin/settings");

  return { ok: true, message: "Location updated." };
}

export async function createDeliveryMethodAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.settings.manage)) {
    return { ok: false, message: "You do not have the settings.manage permission." };
  }

  const name = formData.get("name");
  const kind = formData.get("kind");
  const sortOrder = formData.get("sortOrder");

  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Enter a delivery method name of at least 2 characters." };
  }
  if (typeof kind !== "string" || !VALID_METHOD_KINDS.includes(kind)) {
    return { ok: false, message: "Choose a valid method kind." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("delivery_methods")
    .insert({
      code: slugify(name.trim()).toUpperCase(),
      name: name.trim(),
      kind,
      sort_order: typeof sortOrder === "string" && sortOrder.trim() !== "" ? Number(sortOrder) : 0,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the delivery method.") };
  }

  const methodId = (data as unknown as { id: string }).id;
  const regionResult = await client.from("regions").select("id");
  if (regionResult.error || regionResult.data === null) {
    return { ok: true, message: "Delivery method created (no regions available for rates)." };
  }
  const regionIds = (regionResult.data as unknown as { id: string }[]).map(
    (region) => region.id,
  );
  const rateResult = await client.from("delivery_rates").insert(
    regionIds.map((regionId) => ({
      delivery_method_id: methodId,
      region_id: regionId,
      fee: 0,
      eta_min_days: 1,
      eta_max_days: 5,
      is_active: true,
    })),
  );
  if (rateResult.error) {
    return {
      ok: false,
      message: message(rateResult.error, "Method created but its rates could not be added."),
    };
  }

  await writeAuditLog(session.userId, "create", "delivery_method", methodId, {
    name: name.trim(),
    kind,
  });
  revalidatePath("/admin/settings");

  return { ok: true, message: "Delivery method created." };
}

export async function updateDeliveryMethodAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.settings.manage)) {
    return { ok: false, message: "You do not have the settings.manage permission." };
  }

  const methodId = formData.get("methodId");
  const name = formData.get("name");
  const kind = formData.get("kind");
  const isActive = formData.get("isActive");
  const sortOrder = formData.get("sortOrder");

  if (typeof methodId !== "string" || methodId === "") {
    return { ok: false, message: "Missing delivery method." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Enter a delivery method name of at least 2 characters." };
  }
  if (typeof kind !== "string" || !VALID_METHOD_KINDS.includes(kind)) {
    return { ok: false, message: "Choose a valid method kind." };
  }

  const client = await createClient();
  const { error } = await client
    .from("delivery_methods")
    .update({
      name: name.trim(),
      kind,
      is_active: isActive === "on",
      sort_order: typeof sortOrder === "string" && sortOrder.trim() !== "" ? Number(sortOrder) : 0,
    })
    .eq("id", methodId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the delivery method.") };
  }

  await writeAuditLog(session.userId, "update", "delivery_method", methodId, {
    name: name.trim(),
    kind,
  });
  revalidatePath("/admin/settings");

  return { ok: true, message: "Delivery method updated." };
}

export async function updateDeliveryRateAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.settings.manage)) {
    return { ok: false, message: "You do not have the settings.manage permission." };
  }

  const rateId = formData.get("rateId");
  const fee = parseOptionalAmount(formData.get("fee"));
  const etaMin = formData.get("etaMinDays");
  const etaMax = formData.get("etaMaxDays");
  const isActive = formData.get("isActive");

  if (typeof rateId !== "string" || rateId === "") {
    return { ok: false, message: "Missing delivery rate." };
  }
  if (fee === null || fee < 0) {
    return { ok: false, message: "Enter a valid delivery fee." };
  }
  const etaMinDays = Number(etaMin);
  const etaMaxDays = Number(etaMax);
  if (
    !Number.isInteger(etaMinDays) ||
    !Number.isInteger(etaMaxDays) ||
    etaMinDays < 0 ||
    etaMaxDays < etaMinDays
  ) {
    return { ok: false, message: "ETA must be whole days with max ≥ min." };
  }

  const client = await createClient();
  const { error } = await client
    .from("delivery_rates")
    .update({
      fee,
      eta_min_days: etaMinDays,
      eta_max_days: etaMaxDays,
      is_active: isActive === "on",
    })
    .eq("id", rateId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the delivery rate.") };
  }

  await writeAuditLog(session.userId, "update", "delivery_rate", rateId, {
    fee,
    etaMinDays,
    etaMaxDays,
  });
  revalidatePath("/admin/settings");

  return { ok: true, message: "Delivery rate updated." };
}

export async function upsertSettingAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.settings.manage)) {
    return { ok: false, message: "You do not have the settings.manage permission." };
  }

  const key = formData.get("key");
  const value = formData.get("value");

  if (typeof key !== "string" || key.trim() === "") {
    return { ok: false, message: "A setting key is required." };
  }
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, message: "A setting value is required." };
  }

  const client = await createClient();
  const { data: existing } = await client
    .from("settings")
    .select("id")
    .is("location_id", null)
    .eq("key", key.trim())
    .maybeSingle();

  if (existing) {
    const { error } = await client
      .from("settings")
      .update({ value: value.trim(), updated_by: session.userId })
      .eq("id", (existing as unknown as { id: string }).id);
    if (error) {
      return { ok: false, message: message(error, "Could not update the setting.") };
    }
    await writeAuditLog(session.userId, "update", "setting", (existing as unknown as { id: string }).id, {
      key: key.trim(),
    });
  } else {
    const { data: created, error } = await client
      .from("settings")
      .insert({ key: key.trim(), value: value.trim(), updated_by: session.userId })
      .select("id")
      .single();
    if (error) {
      return { ok: false, message: message(error, "Could not create the setting.") };
    }
    await writeAuditLog(session.userId, "create", "setting", created.id, { key: key.trim() });
  }

  revalidatePath("/admin/settings");
  return { ok: true, message: "Setting saved." };
}