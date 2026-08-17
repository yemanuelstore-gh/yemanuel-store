"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { parseAmount, parseOptionalAmount, slugify } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";

const VALID_PRODUCT_STATUS = ["draft", "active", "inactive", "archived"];
const VALID_VARIANT_STATUS = ["active", "inactive"];
const VALID_PRICE_TYPES = ["selling", "sale"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "A record with the same key already exists.";
    if (text.includes("violates foreign key")) return "The selected reference does not exist.";
    return text;
  }
  return fallback;
}

export async function createProductAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.create)) {
    return { ok: false, message: "You do not have permission to create products." };
  }

  const name = formData.get("name");
  const categoryId = formData.get("categoryId");
  const brandId = formData.get("brandId");
  const status = formData.get("status");
  const description = formData.get("description");
  const rawSlug = formData.get("slug");

  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Product name must be at least 2 characters." };
  }
  if (typeof categoryId !== "string" || categoryId === "") {
    return { ok: false, message: "A category is required." };
  }
  if (typeof status !== "string" || !VALID_PRODUCT_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid product status." };
  }

  const slug =
    typeof rawSlug === "string" && rawSlug.trim() !== ""
      ? slugify(rawSlug)
      : slugify(name);

  const client = await createClient();
  const { data, error } = await client
    .from("products")
    .insert({
      name: name.trim(),
      slug,
      category_id: categoryId,
      brand_id: typeof brandId === "string" && brandId !== "" ? brandId : null,
      status,
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the product.") };
  }

  await writeAuditLog(session.userId, "create", "product", data.id, {
    name: name.trim(),
    slug,
  });

  redirect(`/admin/products/${data.id}`);
}

export async function updateProductAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.update)) {
    return { ok: false, message: "You do not have permission to update products." };
  }

  const productId = formData.get("productId");
  if (typeof productId !== "string" || productId === "") {
    return { ok: false, message: "Missing product." };
  }

  const name = formData.get("name");
  const categoryId = formData.get("categoryId");
  const brandId = formData.get("brandId");
  const status = formData.get("status");
  const description = formData.get("description");
  const rawSlug = formData.get("slug");

  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Product name must be at least 2 characters." };
  }
  if (typeof categoryId !== "string" || categoryId === "") {
    return { ok: false, message: "A category is required." };
  }
  if (typeof status !== "string" || !VALID_PRODUCT_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid product status." };
  }

  const slug =
    typeof rawSlug === "string" && rawSlug.trim() !== ""
      ? slugify(rawSlug)
      : slugify(name);

  const client = await createClient();
  const { error } = await client
    .from("products")
    .update({
      name: name.trim(),
      slug,
      category_id: categoryId,
      brand_id: typeof brandId === "string" && brandId !== "" ? brandId : null,
      status,
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
    })
    .eq("id", productId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the product.") };
  }

  await writeAuditLog(session.userId, "update", "product", productId, {
    name: name.trim(),
    status,
  });

  return { ok: true, message: "Product saved." };
}

function parseVariantOptions(raw: unknown): {
  options: Record<string, unknown> | null;
  error?: string;
} {
  if (typeof raw !== "string" || raw.trim() === "") return { options: null };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {
        options: null,
        error: 'Options must be a JSON object, e.g. {"colour": "Red"}.',
      };
    }
    return { options: parsed as Record<string, unknown> };
  } catch {
    return {
      options: null,
      error: 'Options must be valid JSON, e.g. {"colour": "Red"}.',
    };
  }
}

async function validateVariantUniqueness(
  client: Awaited<ReturnType<typeof createClient>>,
  sku: string,
  barcode: string | null,
  excludeVariantId?: string,
): Promise<string | null> {
  const parts = [`sku.eq.${sku}`];
  if (barcode) parts.push(`barcode.eq.${barcode}`);
  let query = client.from("product_variants").select("id").or(parts.join(","));
  if (excludeVariantId) {
    query = query.neq("id", excludeVariantId);
  }
  const { data } = await query.limit(2);
  if ((data ?? []).length === 0) return null;
  return barcode
    ? "That SKU or barcode is already assigned to another variant."
    : "That SKU is already in use.";
}

export async function createVariantAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.create)) {
    return { ok: false, message: "You do not have permission to add variants." };
  }

  const productId = formData.get("productId");
  const name = formData.get("name");
  const sku = formData.get("sku");
  const barcode = formData.get("barcode");
  const status = formData.get("status");
  const rawOptions = formData.get("options");

  if (typeof productId !== "string" || productId === "") {
    return { ok: false, message: "Missing product." };
  }
  if (typeof name !== "string" || name.trim() === "") {
    return { ok: false, message: "Variant name is required." };
  }
  if (typeof sku !== "string" || sku.trim() === "") {
    return { ok: false, message: "SKU is required — variants are the SKU authority." };
  }
  if (typeof status !== "string" || !VALID_VARIANT_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid variant status." };
  }

  const normalizedSku = sku.trim().toUpperCase();
  const normalizedBarcode =
    typeof barcode === "string" && barcode.trim() !== "" ? barcode.trim() : null;
  const parsedOptions = parseVariantOptions(rawOptions);
  if (parsedOptions.error) {
    return { ok: false, message: parsedOptions.error };
  }

  const client = await createClient();
  const productResult = await client
    .from("products")
    .select("id")
    .eq("id", productId)
    .maybeSingle();
  if (!productResult.data) {
    return { ok: false, message: "The selected product does not exist." };
  }

  const conflict = await validateVariantUniqueness(
    client,
    normalizedSku,
    normalizedBarcode,
  );
  if (conflict) {
    return { ok: false, message: conflict };
  }

  const { data, error } = await client
    .from("product_variants")
    .insert({
      product_id: productId,
      name: name.trim(),
      sku: normalizedSku,
      barcode: normalizedBarcode,
      options: parsedOptions.options,
      status,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not add the variant.") };
  }

  await writeAuditLog(session.userId, "create", "product_variant", data.id, {
    productId,
    sku: normalizedSku,
    barcode: normalizedBarcode,
  });

  if (formData.get("redirect") === "detail") {
    redirect(`/admin/products/variants/${data.id}`);
  }

  return { ok: true, message: "Variant added." };
}

export async function updateVariantAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.update)) {
    return { ok: false, message: "You do not have permission to update variants." };
  }

  const variantId = formData.get("variantId");
  const name = formData.get("name");
  const sku = formData.get("sku");
  const barcode = formData.get("barcode");
  const status = formData.get("status");
  const rawOptions = formData.get("options");

  if (typeof variantId !== "string" || variantId === "") {
    return { ok: false, message: "Missing variant." };
  }
  if (typeof name !== "string" || name.trim() === "") {
    return { ok: false, message: "Variant name is required." };
  }
  if (typeof sku !== "string" || sku.trim() === "") {
    return { ok: false, message: "SKU is required." };
  }
  if (typeof status !== "string" || !VALID_VARIANT_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid variant status." };
  }

  const normalizedSku = sku.trim().toUpperCase();
  const normalizedBarcode =
    typeof barcode === "string" && barcode.trim() !== "" ? barcode.trim() : null;
  const parsedOptions = parseVariantOptions(rawOptions);
  if (parsedOptions.error) {
    return { ok: false, message: parsedOptions.error };
  }

  const client = await createClient();
  const conflict = await validateVariantUniqueness(
    client,
    normalizedSku,
    normalizedBarcode,
    variantId,
  );
  if (conflict) {
    return { ok: false, message: conflict };
  }

  const { error } = await client
    .from("product_variants")
    .update({
      name: name.trim(),
      sku: normalizedSku,
      barcode: normalizedBarcode,
      options: parsedOptions.options,
      status,
    })
    .eq("id", variantId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the variant.") };
  }

  await writeAuditLog(session.userId, "update", "product_variant", variantId, {
    sku: normalizedSku,
    barcode: normalizedBarcode,
  });

  return { ok: true, message: "Variant saved." };
}

function parsePriceWindow(
  validFrom: FormDataEntryValue | null,
  validTo: FormDataEntryValue | null,
): { validFromIso: string; validToIso: string | null; error?: string } {
  const from =
    typeof validFrom === "string" && validFrom.trim() !== ""
      ? new Date(validFrom)
      : new Date();
  if (Number.isNaN(from.getTime())) {
    return { validFromIso: "", validToIso: null, error: "Enter a valid effective-from date." };
  }
  const to = typeof validTo === "string" && validTo.trim() !== "" ? new Date(validTo) : null;
  if (to && Number.isNaN(to.getTime())) {
    return { validFromIso: "", validToIso: null, error: "Enter a valid effective-to date." };
  }
  if (to && from.getTime() > to.getTime()) {
    return {
      validFromIso: "",
      validToIso: null,
      error: "The effective-to date cannot be before the effective-from date.",
    };
  }
  return { validFromIso: from.toISOString(), validToIso: to ? to.toISOString() : null };
}

async function validateLocationExists(locationId: string): Promise<string | null> {
  if (!isServiceConfigured()) return null;
  const service = createServiceClient();
  const { data } = await service
    .from("locations")
    .select("id")
    .eq("id", locationId)
    .maybeSingle();
  if (!data) return "The selected location does not exist.";
  return null;
}

export async function createPriceAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.create)) {
    return { ok: false, message: "You do not have permission to add prices." };
  }

  const productId = formData.get("productId");
  const variantId = formData.get("variantId");
  const priceType = formData.get("priceType");
  const amount = parseAmount(formData.get("amount"));
  const locationId = formData.get("locationId");

  if (typeof priceType !== "string" || !VALID_PRICE_TYPES.includes(priceType)) {
    return { ok: false, message: "Choose a valid price type." };
  }
  if (amount === null || amount < 0) {
    return { ok: false, message: "Enter a valid price amount." };
  }

  const normalizedProductId =
    typeof productId === "string" && productId !== "" ? productId : null;
  const normalizedVariantId =
    typeof variantId === "string" && variantId !== "" ? variantId : null;
  if (!normalizedProductId && !normalizedVariantId) {
    return { ok: false, message: "Choose a product or a variant to price." };
  }

  const window = parsePriceWindow(formData.get("validFrom"), formData.get("validTo"));
  if (window.error) {
    return { ok: false, message: window.error };
  }

  const normalizedLocationId =
    typeof locationId === "string" && locationId !== "" ? locationId : null;
  if (normalizedLocationId) {
    const locationError = await validateLocationExists(normalizedLocationId);
    if (locationError) return { ok: false, message: locationError };
  }

  const client = await createClient();

  if (normalizedProductId) {
    const productResult = await client
      .from("products")
      .select("id")
      .eq("id", normalizedProductId)
      .maybeSingle();
    if (!productResult.data) {
      return { ok: false, message: "The selected product does not exist." };
    }
  }

  if (normalizedVariantId) {
    const variantResult = await client
      .from("product_variants")
      .select("product_id")
      .eq("id", normalizedVariantId)
      .maybeSingle();
    if (!variantResult.data) {
      return { ok: false, message: "The selected variant does not exist." };
    }
    const variant = variantResult.data as unknown as { product_id: string };
    if (
      normalizedProductId &&
      variant.product_id !== normalizedProductId
    ) {
      return { ok: false, message: "The selected variant does not belong to that product." };
    }
  }

  const { data, error } = await client
    .from("prices")
    .insert({
      product_id: normalizedProductId,
      variant_id: normalizedVariantId,
      price_type: priceType,
      amount,
      location_id: normalizedLocationId,
      valid_from: window.validFromIso,
      valid_to: window.validToIso,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not add the price.") };
  }

  await writeAuditLog(session.userId, "create", "price", data.id, {
    productId: normalizedProductId,
    variantId: normalizedVariantId,
    priceType,
    amount,
  });

  return { ok: true, message: "Price added." };
}

export async function updatePriceAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.update)) {
    return { ok: false, message: "You do not have permission to update prices." };
  }

  const priceId = formData.get("priceId");
  if (typeof priceId !== "string" || priceId === "") {
    return { ok: false, message: "Missing price." };
  }

  const priceType = formData.get("priceType");
  const amount = parseAmount(formData.get("amount"));
  const locationId = formData.get("locationId");

  if (typeof priceType !== "string" || !VALID_PRICE_TYPES.includes(priceType)) {
    return { ok: false, message: "Choose a valid price type." };
  }
  if (amount === null || amount < 0) {
    return { ok: false, message: "Enter a valid price amount." };
  }

  const window = parsePriceWindow(formData.get("validFrom"), formData.get("validTo"));
  if (window.error) {
    return { ok: false, message: window.error };
  }

  const normalizedLocationId =
    typeof locationId === "string" && locationId !== "" ? locationId : null;
  if (normalizedLocationId) {
    const locationError = await validateLocationExists(normalizedLocationId);
    if (locationError) return { ok: false, message: locationError };
  }

  const client = await createClient();
  const existing = await client
    .from("prices")
    .select("id, product_id, variant_id")
    .eq("id", priceId)
    .maybeSingle();
  if (!existing.data) {
    return { ok: false, message: "The price no longer exists." };
  }

  const { error } = await client
    .from("prices")
    .update({
      price_type: priceType,
      amount,
      location_id: normalizedLocationId,
      valid_from: window.validFromIso,
      valid_to: window.validToIso,
    })
    .eq("id", priceId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the price.") };
  }

  await writeAuditLog(session.userId, "update", "price", priceId, {
    priceType,
    amount,
  });

  revalidatePath("/admin/products/prices");
  revalidatePath("/admin/products/variants");

  return { ok: true, message: "Price saved." };
}

export async function updateVariantBarcodeAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.update)) {
    return { ok: false, message: "You do not have permission to update barcodes." };
  }

  const variantId = formData.get("variantId");
  const rawBarcode = formData.get("barcode");

  if (typeof variantId !== "string" || variantId === "") {
    return { ok: false, message: "Missing variant." };
  }

  const barcode =
    typeof rawBarcode === "string" && rawBarcode.trim() !== ""
      ? rawBarcode.trim()
      : null;

  const client = await createClient();
  const variantResult = await client
    .from("product_variants")
    .select("id, barcode")
    .eq("id", variantId)
    .maybeSingle();
  if (!variantResult.data) {
    return { ok: false, message: "The variant no longer exists." };
  }
  const current = variantResult.data as unknown as { barcode: string | null };

  if (current.barcode === barcode) {
    return { ok: true, message: "No change." };
  }

  if (barcode) {
    const duplicate = await client
      .from("product_variants")
      .select("id")
      .eq("barcode", barcode)
      .neq("id", variantId)
      .limit(1);
    if ((duplicate.data ?? []).length > 0) {
      return { ok: false, message: "That barcode is already assigned to another variant." };
    }
  }

  const { error } = await client
    .from("product_variants")
    .update({ barcode })
    .eq("id", variantId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the barcode.") };
  }

  const action = barcode
    ? current.barcode === null
      ? "barcode_assign"
      : "barcode_change"
    : "barcode_clear";

  await writeAuditLog(session.userId, action, "product_variant", variantId, {
    barcode,
  });

  revalidatePath("/admin/products/barcodes");
  revalidatePath("/admin/products/variants");

  return { ok: true, message: barcode ? "Barcode saved." : "Barcode cleared." };
}

export async function deletePriceAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.create)) {
    return { ok: false, message: "You do not have permission to delete prices." };
  }

  const priceId = formData.get("priceId");
  if (typeof priceId !== "string" || priceId === "") {
    return { ok: false, message: "Missing price." };
  }

  const client = await createClient();
  const { error } = await client.from("prices").delete().eq("id", priceId);

  if (error) {
    return { ok: false, message: message(error, "Could not delete the price.") };
  }

  await writeAuditLog(session.userId, "delete", "price", priceId);

  return { ok: true, message: "Price deleted." };
}

export async function createImageAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.create)) {
    return { ok: false, message: "You do not have permission to add images." };
  }

  const productId = formData.get("productId");
  const variantId = formData.get("variantId");
  const url = formData.get("url");
  const altText = formData.get("altText");
  const sortOrder = parseOptionalAmount(formData.get("sortOrder"));
  const isPrimary = formData.get("isPrimary") === "on";

  if (typeof productId !== "string" || productId === "") {
    return { ok: false, message: "Missing product." };
  }
  const normalizedVariantId =
    typeof variantId === "string" && variantId !== "" ? variantId : null;
  if (typeof url !== "string" || url.trim() === "") {
    return { ok: false, message: "Image URL is required." };
  }
  if (typeof url === "string" && !/^https?:\/\//.test(url.trim())) {
    return { ok: false, message: "Image URL must start with http:// or https://." };
  }

  const client = await createClient();

  if (normalizedVariantId) {
    const variantResult = await client
      .from("product_variants")
      .select("product_id")
      .eq("id", normalizedVariantId)
      .maybeSingle();
    if (!variantResult.data) {
      return { ok: false, message: "The selected variant does not exist." };
    }
    const variant = variantResult.data as unknown as { product_id: string };
    if (variant.product_id !== productId) {
      return { ok: false, message: "The selected variant does not belong to that product." };
    }
  }

  if (isPrimary) {
    const { error: unsetError } = await client
      .from("product_images")
      .update({ is_primary: false })
      .eq("product_id", productId);
    if (unsetError) {
      return {
        ok: false,
        message:
          "Could not update existing images (this needs the update permission).",
      };
    }
  }

  const { data, error } = await client
    .from("product_images")
    .insert({
      product_id: productId,
      variant_id: normalizedVariantId,
      url: url.trim(),
      alt_text: typeof altText === "string" && altText.trim() !== "" ? altText.trim() : null,
      sort_order: sortOrder ?? 0,
      is_primary: isPrimary && !normalizedVariantId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not add the image.") };
  }

  await writeAuditLog(session.userId, "create", "product_image", data.id, {
    productId,
    variantId: normalizedVariantId,
    isPrimary: isPrimary && !normalizedVariantId,
  });

  return { ok: true, message: "Image added." };
}

export async function deleteImageAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.create)) {
    return { ok: false, message: "You do not have permission to delete images." };
  }

  const imageId = formData.get("imageId");
  if (typeof imageId !== "string" || imageId === "") {
    return { ok: false, message: "Missing image." };
  }

  const client = await createClient();
  const { error } = await client.from("product_images").delete().eq("id", imageId);

  if (error) {
    return { ok: false, message: message(error, "Could not delete the image.") };
  }

  await writeAuditLog(session.userId, "delete", "product_image", imageId);

  return { ok: true, message: "Image deleted." };
}