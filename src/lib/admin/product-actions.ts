"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { parseAmount, parseOptionalAmount, slugify } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";

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

  let options: Record<string, unknown> | null = null;
  if (typeof rawOptions === "string" && rawOptions.trim() !== "") {
    try {
      const parsed = JSON.parse(rawOptions);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { ok: false, message: "Options must be a JSON object, e.g. {\"colour\": \"Red\"}." };
      }
      options = parsed as Record<string, unknown>;
    } catch {
      return { ok: false, message: "Options must be valid JSON, e.g. {\"colour\": \"Red\"}." };
    }
  }

  const client = await createClient();
  const { data, error } = await client
    .from("product_variants")
    .insert({
      product_id: productId,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: typeof barcode === "string" && barcode.trim() !== "" ? barcode.trim() : null,
      options,
      status,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not add the variant.") };
  }

  await writeAuditLog(session.userId, "create", "product_variant", data.id, {
    productId,
    sku: sku.trim().toUpperCase(),
  });

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

  const client = await createClient();
  const { error } = await client
    .from("product_variants")
    .update({
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: typeof barcode === "string" && barcode.trim() !== "" ? barcode.trim() : null,
      status,
    })
    .eq("id", variantId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the variant.") };
  }

  await writeAuditLog(session.userId, "update", "product_variant", variantId);

  return { ok: true, message: "Variant saved." };
}

export async function createPriceAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.create)) {
    return { ok: false, message: "You do not have permission to add prices." };
  }

  const variantId = formData.get("variantId");
  const priceType = formData.get("priceType");
  const amount = parseAmount(formData.get("amount"));
  const locationId = formData.get("locationId");
  const validFrom = formData.get("validFrom");
  const validTo = formData.get("validTo");

  if (typeof variantId !== "string" || variantId === "") {
    return { ok: false, message: "Missing variant." };
  }
  if (typeof priceType !== "string" || !VALID_PRICE_TYPES.includes(priceType)) {
    return { ok: false, message: "Choose a valid price type." };
  }
  if (amount === null || amount < 0) {
    return { ok: false, message: "Enter a valid price amount." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("prices")
    .insert({
      variant_id: variantId,
      price_type: priceType,
      amount,
      location_id:
        typeof locationId === "string" && locationId !== "" ? locationId : null,
      valid_from:
        typeof validFrom === "string" && validFrom !== ""
          ? new Date(validFrom).toISOString()
          : new Date().toISOString(),
      valid_to:
        typeof validTo === "string" && validTo !== ""
          ? new Date(validTo).toISOString()
          : null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not add the price.") };
  }

  await writeAuditLog(session.userId, "create", "price", data.id, {
    variantId,
    priceType,
    amount,
  });

  return { ok: true, message: "Price added." };
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
  const url = formData.get("url");
  const altText = formData.get("altText");
  const sortOrder = parseOptionalAmount(formData.get("sortOrder"));
  const isPrimary = formData.get("isPrimary") === "on";

  if (typeof productId !== "string" || productId === "") {
    return { ok: false, message: "Missing product." };
  }
  if (typeof url !== "string" || url.trim() === "") {
    return { ok: false, message: "Image URL is required." };
  }
  if (typeof url === "string" && !/^https?:\/\//.test(url.trim())) {
    return { ok: false, message: "Image URL must start with http:// or https://." };
  }

  const client = await createClient();

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
      url: url.trim(),
      alt_text: typeof altText === "string" && altText.trim() !== "" ? altText.trim() : null,
      sort_order: sortOrder ?? 0,
      is_primary: isPrimary,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not add the image.") };
  }

  await writeAuditLog(session.userId, "create", "product_image", data.id, {
    productId,
    isPrimary,
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