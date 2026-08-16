"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createServiceClient,
  isServiceConfigured,
} from "@/lib/supabase/service";
import {
  isNonEmpty,
  isValidFullName,
  isValidGhanaPhone,
} from "@/lib/validation";

export type AddressActionResult = {
  ok: boolean;
  message: string;
};

async function currentCustomerId(): Promise<string | null> {
  try {
    const client = await createClient();
    const { data } = await client.auth.getUser();
    if (!data.user) return null;
    const customer = await client
      .from("customers")
      .select("id")
      .eq("profile_id", data.user.id)
      .maybeSingle();
    if (customer.error || !customer.data) return null;
    return customer.data.id as string;
  } catch {
    return null;
  }
}

async function clearDefaultFlags(
  customerId: string,
  columns: ("is_default_delivery" | "is_default_billing")[],
): Promise<boolean> {
  const client = createServiceClient();
  const update: Record<string, boolean> = {};
  for (const column of columns) update[column] = false;
  const { error } = await client
    .from("customer_addresses")
    .update(update)
    .eq("customer_id", customerId);
  return !error;
}

export async function saveAddressAction(
  _previousState: AddressActionResult,
  formData: FormData,
): Promise<AddressActionResult> {
  const addressId = String(formData.get("addressId") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const recipientName = String(formData.get("recipientName") ?? "").trim();
  const recipientPhone = String(formData.get("recipientPhone") ?? "").trim();
  const addressLine1 = String(formData.get("addressLine1") ?? "").trim();
  const addressLine2 = String(formData.get("addressLine2") ?? "").trim();
  const regionId = String(formData.get("regionId") ?? "").trim();
  const cityId = String(formData.get("cityId") ?? "").trim();
  const postalCode = String(formData.get("postalCode") ?? "").trim();
  const isDefaultDelivery = formData.get("isDefaultDelivery") === "on";
  const isDefaultBilling = formData.get("isDefaultBilling") === "on";

  if (!isNonEmpty(label)) {
    return { ok: false, message: "Please give this address a label (e.g. Home)." };
  }
  if (!isValidFullName(recipientName)) {
    return { ok: false, message: "Please enter the recipient's full name." };
  }
  if (!isValidGhanaPhone(recipientPhone)) {
    return {
      ok: false,
      message: "Please enter a valid Ghana phone number (e.g. 024 412 3456).",
    };
  }
  if (!isNonEmpty(addressLine1)) {
    return { ok: false, message: "Please enter the address line." };
  }
  if (!isNonEmpty(regionId) || !isNonEmpty(cityId)) {
    return { ok: false, message: "Please choose a region and city." };
  }
  if (!isServiceConfigured()) {
    return { ok: false, message: "Addresses are unavailable right now." };
  }

  const customerId = await currentCustomerId();
  if (!customerId) {
    return { ok: false, message: "You need to be signed in to save an address." };
  }

  const client = createServiceClient();

  const defaults: Record<string, boolean> = {};
  if (isDefaultDelivery) defaults.is_default_delivery = true;
  if (isDefaultBilling) defaults.is_default_billing = true;
  const defaultColumns = isDefaultDelivery
    ? (["is_default_delivery"] as const)
    : [];
  const billingColumns = isDefaultBilling
    ? (["is_default_billing"] as const)
    : [];

  if (
    defaultColumns.length > 0 &&
    !(await clearDefaultFlags(customerId, [...defaultColumns, ...billingColumns]))
  ) {
    return { ok: false, message: "We could not save your address. Please try again." };
  }

  const values = {
    customer_id: customerId,
    label,
    recipient_name: recipientName,
    recipient_phone: recipientPhone,
    address_line_1: addressLine1,
    address_line_2: addressLine2 === "" ? null : addressLine2,
    city_id: cityId,
    region_id: regionId,
    postal_code: postalCode === "" ? null : postalCode,
    ...defaults,
  };

  const result = addressId
    ? await client
        .from("customer_addresses")
        .update(values)
        .eq("id", addressId)
        .eq("customer_id", customerId)
    : await client.from("customer_addresses").insert(values);

  if (result.error) {
    return { ok: false, message: "We could not save your address. Please try again." };
  }

  revalidatePath("/account");
  return { ok: true, message: addressId ? "Address updated." : "Address added." };
}

export async function deleteAddressAction(formData: FormData): Promise<void> {
  const addressId = String(formData.get("addressId") ?? "").trim();
  if (!addressId || !isServiceConfigured()) return;

  const customerId = await currentCustomerId();
  if (!customerId) return;

  await createServiceClient()
    .from("customer_addresses")
    .delete()
    .eq("id", addressId)
    .eq("customer_id", customerId);

  revalidatePath("/account");
}