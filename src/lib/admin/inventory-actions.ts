"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { nextDocumentNumber, parseQuantity } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "A record with the same key already exists.";
    if (text.includes("violates foreign key")) return "A selected reference does not exist.";
    return text;
  }
  return fallback;
}

function parseRows(formData: FormData): { variantId: string; quantity: number }[] {
  const rows: { variantId: string; quantity: number }[] = [];
  let index = 0;
  for (;;) {
    const variantId = formData.get(`variantId-${index}`);
    const quantity = parseQuantity(formData.get(`quantity-${index}`));
    if (variantId === null) break;
    if (typeof variantId === "string" && variantId !== "" && quantity !== null) {
      rows.push({ variantId, quantity });
    }
    index += 1;
  }
  return rows;
}

export async function createTransferAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.inventory.create)) {
    return { ok: false, message: "You do not have permission to create transfers." };
  }

  const fromLocationId = formData.get("fromLocationId");
  const toLocationId = formData.get("toLocationId");
  const notes = formData.get("notes");

  if (typeof fromLocationId !== "string" || fromLocationId === "") {
    return { ok: false, message: "A source location is required." };
  }
  if (typeof toLocationId !== "string" || toLocationId === "") {
    return { ok: false, message: "A destination location is required." };
  }
  if (fromLocationId === toLocationId) {
    return { ok: false, message: "Source and destination must be different locations." };
  }

  const items = parseRows(formData);
  if (items.length === 0) {
    return { ok: false, message: "Add at least one variant with a quantity." };
  }
  const uniqueVariants = new Set(items.map((item) => item.variantId));
  if (uniqueVariants.size !== items.length) {
    return { ok: false, message: "Each variant can only appear once per transfer." };
  }

  const transferNumber = await nextDocumentNumber("TRF");
  const client = await createClient();

  const { data: transfer, error: transferError } = await client
    .from("stock_transfers")
    .insert({
      transfer_number: transferNumber,
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
      status: "draft",
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (transferError) {
    return { ok: false, message: message(transferError, "Could not create the transfer.") };
  }

  const { error: itemsError } = await client.from("stock_transfer_items").insert(
    items.map((item) => ({
      transfer_id: transfer.id,
      variant_id: item.variantId,
      quantity: item.quantity,
      status: "pending",
    })),
  );

  if (itemsError) {
    return { ok: false, message: message(itemsError, "Could not add transfer items.") };
  }

  await writeAuditLog(session.userId, "create", "stock_transfer", transfer.id, {
    transferNumber,
    itemCount: items.length,
  });

  redirect(`/admin/inventory/transfers/${transfer.id}`);
}

export async function updateTransferStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.inventory.update)) {
    return { ok: false, message: "You do not have permission to update transfers." };
  }

  const transferId = formData.get("transferId");
  const status = formData.get("status");
  if (typeof transferId !== "string" || transferId === "") {
    return { ok: false, message: "Missing transfer." };
  }
  if (typeof status !== "string" || !["received", "cancelled"].includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { error } = await client
    .from("stock_transfers")
    .update({ status })
    .eq("id", transferId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the transfer.") };
  }

  await writeAuditLog(session.userId, "update", "stock_transfer", transferId, { status });

  return { ok: true, message: "Transfer updated." };
}

export async function updateTransferItemStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.inventory.update)) {
    return { ok: false, message: "You do not have permission to update transfer items." };
  }

  const itemId = formData.get("itemId");
  const status = formData.get("status");
  if (typeof itemId !== "string" || itemId === "") {
    return { ok: false, message: "Missing item." };
  }
  if (typeof status !== "string" || !["pending", "shipped", "received"].includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { error } = await client
    .from("stock_transfer_items")
    .update({ status })
    .eq("id", itemId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the item.") };
  }

  await writeAuditLog(session.userId, "update", "stock_transfer_item", itemId, { status });

  return { ok: true, message: "Item updated." };
}

export async function createAdjustmentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.inventory.adjust)) {
    return { ok: false, message: "You do not have permission to create adjustments." };
  }

  const reason = formData.get("reason");
  if (typeof reason !== "string" || reason.trim().length < 3) {
    return { ok: false, message: "A reason of at least 3 characters is required." };
  }

  const items: { inventoryItemId: string; quantityChange: number; reason: string }[] = [];
  let index = 0;
  for (;;) {
    const inventoryItemId = formData.get(`inventoryItemId-${index}`);
    const rawQuantity = formData.get(`quantityChange-${index}`);
    const itemReason = formData.get(`itemReason-${index}`);
    if (inventoryItemId === null) break;
    if (typeof inventoryItemId === "string" && inventoryItemId !== "" && rawQuantity) {
      const quantity = Number(rawQuantity);
      if (Number.isFinite(quantity) && quantity !== 0) {
        items.push({
          inventoryItemId,
          quantityChange: quantity,
          reason:
            typeof itemReason === "string" && itemReason.trim() !== ""
              ? itemReason.trim()
              : reason.trim(),
        });
      }
    }
    index += 1;
  }

  if (items.length === 0) {
    return {
      ok: false,
      message: "Add at least one inventory item with a non-zero signed quantity.",
    };
  }

  const adjustmentNumber = await nextDocumentNumber("ADJ");
  const client = await createClient();

  const { data: adjustment, error: adjustmentError } = await client
    .from("stock_adjustments")
    .insert({
      adjustment_number: adjustmentNumber,
      reason: reason.trim(),
      status: "draft",
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (adjustmentError) {
    return { ok: false, message: message(adjustmentError, "Could not create the adjustment.") };
  }

  const { error: itemsError } = await client.from("stock_adjustment_items").insert(
    items.map((item) => ({
      adjustment_id: adjustment.id,
      inventory_item_id: item.inventoryItemId,
      quantity_change: item.quantityChange,
      reason: item.reason,
    })),
  );

  if (itemsError) {
    return { ok: false, message: message(itemsError, "Could not add adjustment items.") };
  }

  await writeAuditLog(session.userId, "create", "stock_adjustment", adjustment.id, {
    adjustmentNumber,
    itemCount: items.length,
  });

  redirect(`/admin/inventory/adjustments/${adjustment.id}`);
}

export async function updateAdjustmentStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.inventory.adjust)) {
    return { ok: false, message: "You do not have permission to update adjustments." };
  }

  const adjustmentId = formData.get("adjustmentId");
  const status = formData.get("status");
  if (typeof adjustmentId !== "string" || adjustmentId === "") {
    return { ok: false, message: "Missing adjustment." };
  }
  if (typeof status !== "string" || !["applied", "cancelled"].includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { error } = await client
    .from("stock_adjustments")
    .update({ status })
    .eq("id", adjustmentId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the adjustment.") };
  }

  await writeAuditLog(session.userId, "update", "stock_adjustment", adjustmentId, {
    status,
  });

  return { ok: true, message: "Adjustment updated." };
}