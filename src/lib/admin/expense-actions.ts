"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { nextDocumentNumber, parseAmount } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";

const VALID_EXPENSE_METHODS = ["cash", "mobile_money", "card", "bank_transfer", "other"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "A record with the same name or number already exists.";
    if (text.includes("violates foreign key")) return "A selected reference does not exist.";
    return text;
  }
  return fallback;
}

export async function createExpenseAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.create)) {
    return { ok: false, message: "You do not have permission to record expenses." };
  }

  const categoryId = formData.get("categoryId");
  const description = formData.get("description");
  const amount = parseAmount(formData.get("amount"));
  const expenseDate = formData.get("expenseDate");
  const method = formData.get("method");
  const referenceNumber = formData.get("referenceNumber");
  const supplierId = formData.get("supplierId");
  const locationId = formData.get("locationId");
  const notes = formData.get("notes");

  if (typeof categoryId !== "string" || categoryId === "") {
    return { ok: false, message: "A category is required." };
  }
  if (typeof description !== "string" || description.trim().length < 3) {
    return { ok: false, message: "Enter a description of at least 3 characters." };
  }
  if (amount === null || amount <= 0) {
    return { ok: false, message: "Enter a valid amount." };
  }
  if (typeof expenseDate !== "string" || expenseDate.trim() === "") {
    return { ok: false, message: "The expense date is required." };
  }
  if (typeof method !== "string" || !VALID_EXPENSE_METHODS.includes(method)) {
    return { ok: false, message: "Choose a valid payment method." };
  }

  const expenseNumber = await nextDocumentNumber("EXP");
  const client = await createClient();

  const { data, error } = await client
    .from("expenses")
    .insert({
      expense_number: expenseNumber,
      category_id: categoryId,
      description: description.trim(),
      amount,
      expense_date: expenseDate.trim(),
      method,
      reference_number:
        typeof referenceNumber === "string" && referenceNumber.trim() !== ""
          ? referenceNumber.trim()
          : null,
      supplier_id: typeof supplierId === "string" && supplierId !== "" ? supplierId : null,
      location_id: typeof locationId === "string" && locationId !== "" ? locationId : null,
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not record the expense.") };
  }

  await writeAuditLog(session.userId, "create", "expense", data.id, {
    expenseNumber,
    amount,
  });

  redirect(`/admin/expenses/${data.id}`);
}

export async function createExpenseCategoryAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.create)) {
    return { ok: false, message: "You do not have permission to create expense categories." };
  }

  const name = formData.get("name");
  const description = formData.get("description");
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Enter a category name of at least 2 characters." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("expense_categories")
    .insert({
      name: name.trim(),
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the category.") };
  }

  await writeAuditLog(session.userId, "create", "expense_category", data.id, {
    name: name.trim(),
  });
  revalidatePath("/admin/expenses");

  return { ok: true, message: "Category created." };
}

export async function updateExpenseCategoryAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.expenses.update)) {
    return { ok: false, message: "You do not have permission to update expense categories." };
  }

  const categoryId = formData.get("categoryId");
  const name = formData.get("name");
  const description = formData.get("description");
  const isActive = formData.get("isActive");

  if (typeof categoryId !== "string" || categoryId === "") {
    return { ok: false, message: "Missing category." };
  }
  if (typeof name !== "string" || name.trim().length < 2) {
    return { ok: false, message: "Enter a category name of at least 2 characters." };
  }

  const client = await createClient();
  const { error } = await client
    .from("expense_categories")
    .update({
      name: name.trim(),
      description:
        typeof description === "string" && description.trim() !== ""
          ? description.trim()
          : null,
      is_active: isActive === "on",
    })
    .eq("id", categoryId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the category.") };
  }

  await writeAuditLog(session.userId, "update", "expense_category", categoryId, {
    name: name.trim(),
  });
  revalidatePath("/admin/expenses");

  return { ok: true, message: "Category updated." };
}