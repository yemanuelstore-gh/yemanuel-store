"use server";

import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { slugify } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";

const VALID_ENTITY_STATUS = ["active", "inactive"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) {
      return "A record with the same slug or name already exists.";
    }
    return text;
  }
  return fallback;
}

export async function createCategoryAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.create)) {
    return { ok: false, message: "You do not have permission to create categories." };
  }

  const name = formData.get("name");
  const parentId = formData.get("parentId");
  const description = formData.get("description");
  const imageUrl = formData.get("imageUrl");
  const rawSort = formData.get("sortOrder");
  const status = formData.get("status");
  const rawSlug = formData.get("slug");

  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Category name must be at least 2 characters." };
  }
  if (typeof status !== "string" || !VALID_ENTITY_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid status." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("categories")
    .insert({
      name: name.trim(),
      slug:
        typeof rawSlug === "string" && rawSlug.trim() !== ""
          ? slugify(rawSlug)
          : slugify(name),
      parent_id: typeof parentId === "string" && parentId !== "" ? parentId : null,
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
      image_url:
        typeof imageUrl === "string" && imageUrl.trim() !== "" ? imageUrl.trim() : null,
      sort_order: Number(rawSort) || 0,
      status,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the category.") };
  }

  await writeAuditLog(session.userId, "create", "category", data.id, {
    name: name.trim(),
  });

  return { ok: true, message: "Category created." };
}

export async function updateCategoryAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.update)) {
    return { ok: false, message: "You do not have permission to update categories." };
  }

  const categoryId = formData.get("categoryId");
  const name = formData.get("name");
  const parentId = formData.get("parentId");
  const description = formData.get("description");
  const imageUrl = formData.get("imageUrl");
  const rawSort = formData.get("sortOrder");
  const status = formData.get("status");
  const rawSlug = formData.get("slug");

  if (typeof categoryId !== "string" || categoryId === "") {
    return { ok: false, message: "Missing category." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Category name must be at least 2 characters." };
  }
  if (typeof status !== "string" || !VALID_ENTITY_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid status." };
  }

  const client = await createClient();
  const { error } = await client
    .from("categories")
    .update({
      name: name.trim(),
      slug:
        typeof rawSlug === "string" && rawSlug.trim() !== ""
          ? slugify(rawSlug)
          : slugify(name),
      parent_id: typeof parentId === "string" && parentId !== "" ? parentId : null,
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
      image_url:
        typeof imageUrl === "string" && imageUrl.trim() !== "" ? imageUrl.trim() : null,
      sort_order: Number(rawSort) || 0,
      status,
    })
    .eq("id", categoryId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the category.") };
  }

  await writeAuditLog(session.userId, "update", "category", categoryId, {
    name: name.trim(),
    status,
  });

  return { ok: true, message: "Category saved." };
}

export async function createBrandAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.create)) {
    return { ok: false, message: "You do not have permission to create brands." };
  }

  const name = formData.get("name");
  const description = formData.get("description");
  const status = formData.get("status");
  const rawSlug = formData.get("slug");

  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Brand name must be at least 2 characters." };
  }
  if (typeof status !== "string" || !VALID_ENTITY_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid status." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("brands")
    .insert({
      name: name.trim(),
      slug:
        typeof rawSlug === "string" && rawSlug.trim() !== ""
          ? slugify(rawSlug)
          : slugify(name),
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
      status,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the brand.") };
  }

  await writeAuditLog(session.userId, "create", "brand", data.id, { name: name.trim() });

  return { ok: true, message: "Brand created." };
}

export async function updateBrandAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.products.update)) {
    return { ok: false, message: "You do not have permission to update brands." };
  }

  const brandId = formData.get("brandId");
  const name = formData.get("name");
  const description = formData.get("description");
  const status = formData.get("status");
  const rawSlug = formData.get("slug");

  if (typeof brandId !== "string" || brandId === "") {
    return { ok: false, message: "Missing brand." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Brand name must be at least 2 characters." };
  }
  if (typeof status !== "string" || !VALID_ENTITY_STATUS.includes(status)) {
    return { ok: false, message: "Choose a valid status." };
  }

  const client = await createClient();
  const { error } = await client
    .from("brands")
    .update({
      name: name.trim(),
      slug:
        typeof rawSlug === "string" && rawSlug.trim() !== ""
          ? slugify(rawSlug)
          : slugify(name),
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
      status,
    })
    .eq("id", brandId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the brand.") };
  }

  await writeAuditLog(session.userId, "update", "brand", brandId, {
    name: name.trim(),
    status,
  });

  return { ok: true, message: "Brand saved." };
}