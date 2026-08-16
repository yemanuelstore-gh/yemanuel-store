"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { nextDocumentNumber, parseAmount, parseQuantity } from "@/lib/admin/doc-numbers";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { createClient } from "@/lib/supabase/server";

const VALID_PO_STATUS = ["sent", "partially_received", "received", "cancelled"];
const VALID_RECEIPT_STATUS = ["completed", "cancelled"];
const VALID_INVOICE_STATUS = ["partially_paid", "paid", "cancelled"];
const VALID_PAYMENT_METHODS = ["cash", "mobile_money", "card", "bank_transfer", "other"];

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "A record with the same number already exists.";
    if (text.includes("violates foreign key")) return "A selected reference does not exist.";
    return text;
  }
  return fallback;
}

function parseRows(formData: FormData): { variantId: string; quantity: number; unitCost: number }[] {
  const rows: { variantId: string; quantity: number; unitCost: number }[] = [];
  let index = 0;
  for (;;) {
    const variantId = formData.get(`variantId-${index}`);
    const quantity = parseQuantity(formData.get(`quantity-${index}`));
    const unitCost = parseAmount(formData.get(`unitCost-${index}`));
    if (variantId === null) break;
    if (typeof variantId === "string" && variantId !== "" && quantity !== null && unitCost !== null) {
      rows.push({ variantId, quantity, unitCost });
    }
    index += 1;
  }
  return rows;
}

export async function createPurchaseOrderAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.purchases.create)) {
    return { ok: false, message: "You do not have permission to create purchase orders." };
  }

  const supplierId = formData.get("supplierId");
  const locationId = formData.get("locationId");
  const expectedDate = formData.get("expectedDate");
  const notes = formData.get("notes");

  if (typeof supplierId !== "string" || supplierId === "") {
    return { ok: false, message: "A supplier is required." };
  }
  if (typeof locationId !== "string" || locationId === "") {
    return { ok: false, message: "A receiving location is required." };
  }

  const items = parseRows(formData);
  if (items.length === 0) {
    return { ok: false, message: "Add at least one line item." };
  }

  const poNumber = await nextDocumentNumber("PO");
  const client = await createClient();

  const { data: po, error: poError } = await client
    .from("purchase_orders")
    .insert({
      po_number: poNumber,
      supplier_id: supplierId,
      location_id: locationId,
      status: "draft",
      expected_date:
        typeof expectedDate === "string" && expectedDate.trim() !== ""
          ? expectedDate.trim()
          : null,
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (poError) {
    return { ok: false, message: message(poError, "Could not create the purchase order.") };
  }

  const { error: itemsError } = await client.from("purchase_order_items").insert(
    items.map((item) => ({
      purchase_order_id: po.id,
      variant_id: item.variantId,
      quantity_ordered: item.quantity,
      unit_cost_expected: item.unitCost,
      quantity_received: 0,
    })),
  );

  if (itemsError) {
    return { ok: false, message: message(itemsError, "Could not add line items.") };
  }

  await writeAuditLog(session.userId, "create", "purchase_order", po.id, {
    poNumber,
    itemCount: items.length,
  });

  redirect(`/admin/purchases/orders/${po.id}`);
}

export async function updatePurchaseOrderStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.purchases.update)) {
    return { ok: false, message: "You do not have permission to update purchase orders." };
  }

  const poId = formData.get("poId");
  const status = formData.get("status");
  if (typeof poId !== "string" || poId === "") {
    return { ok: false, message: "Missing purchase order." };
  }
  if (typeof status !== "string" || !VALID_PO_STATUS.includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { error } = await client
    .from("purchase_orders")
    .update({ status })
    .eq("id", poId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the purchase order.") };
  }

  await writeAuditLog(session.userId, "update", "purchase_order", poId, { status });

  return { ok: true, message: "Purchase order updated." };
}

export async function createGoodsReceiptAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.purchases.create)) {
    return { ok: false, message: "You do not have permission to create goods receipts." };
  }

  const purchaseOrderId = formData.get("purchaseOrderId");
  const locationId = formData.get("locationId");
  const receivedDate = formData.get("receivedDate");
  const notes = formData.get("notes");

  if (typeof locationId !== "string" || locationId === "") {
    return { ok: false, message: "A receiving location is required." };
  }
  if (typeof receivedDate !== "string" || receivedDate.trim() === "") {
    return { ok: false, message: "The received date is required." };
  }

  const items = parseRows(formData);
  if (items.length === 0) {
    return { ok: false, message: "Add at least one received item." };
  }

  const receiptNumber = await nextDocumentNumber("GR");
  const client = await createClient();

  const { data: receipt, error: receiptError } = await client
    .from("goods_receipts")
    .insert({
      receipt_number: receiptNumber,
      purchase_order_id:
        typeof purchaseOrderId === "string" && purchaseOrderId !== ""
          ? purchaseOrderId
          : null,
      location_id: locationId,
      received_date: receivedDate.trim(),
      status: "draft",
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (receiptError) {
    return { ok: false, message: message(receiptError, "Could not create the receipt.") };
  }

  const { error: itemsError } = await client.from("goods_receipt_items").insert(
    items.map((item) => ({
      goods_receipt_id: receipt.id,
      variant_id: item.variantId,
      quantity_received: item.quantity,
      unit_cost_actual: item.unitCost,
    })),
  );

  if (itemsError) {
    return { ok: false, message: message(itemsError, "Could not add received items.") };
  }

  await writeAuditLog(session.userId, "create", "goods_receipt", receipt.id, {
    receiptNumber,
    itemCount: items.length,
  });

  redirect(`/admin/purchases/receipts/${receipt.id}`);
}

export async function updateGoodsReceiptStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.purchases.update)) {
    return { ok: false, message: "You do not have permission to update receipts." };
  }

  const receiptId = formData.get("receiptId");
  const status = formData.get("status");
  if (typeof receiptId !== "string" || receiptId === "") {
    return { ok: false, message: "Missing receipt." };
  }
  if (typeof status !== "string" || !VALID_RECEIPT_STATUS.includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { error } = await client.from("goods_receipts").update({ status }).eq("id", receiptId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the receipt.") };
  }

  await writeAuditLog(session.userId, "update", "goods_receipt", receiptId, { status });

  return { ok: true, message: "Receipt updated." };
}

export async function createSupplierInvoiceAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.purchases.create)) {
    return { ok: false, message: "You do not have permission to create invoices." };
  }

  const invoiceNumber = formData.get("invoiceNumber");
  const supplierId = formData.get("supplierId");
  const purchaseOrderId = formData.get("purchaseOrderId");
  const invoiceDate = formData.get("invoiceDate");
  const dueDate = formData.get("dueDate");
  const amount = parseAmount(formData.get("amount"));
  const notes = formData.get("notes");

  if (typeof invoiceNumber !== "string" || invoiceNumber.trim() === "") {
    return { ok: false, message: "The supplier invoice number is required." };
  }
  if (typeof supplierId !== "string" || supplierId === "") {
    return { ok: false, message: "A supplier is required." };
  }
  if (typeof invoiceDate !== "string" || invoiceDate.trim() === "") {
    return { ok: false, message: "The invoice date is required." };
  }
  if (amount === null || amount <= 0) {
    return { ok: false, message: "Enter a valid invoice amount." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("supplier_invoices")
    .insert({
      invoice_number: invoiceNumber.trim(),
      supplier_id: supplierId,
      purchase_order_id:
        typeof purchaseOrderId === "string" && purchaseOrderId !== ""
          ? purchaseOrderId
          : null,
      invoice_date: invoiceDate.trim(),
      due_date: typeof dueDate === "string" && dueDate.trim() !== "" ? dueDate.trim() : null,
      amount,
      status: "pending",
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not create the invoice.") };
  }

  await writeAuditLog(session.userId, "create", "supplier_invoice", data.id, {
    invoiceNumber: invoiceNumber.trim(),
    amount,
  });

  return { ok: true, message: "Invoice recorded." };
}

export async function updateSupplierInvoiceStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.purchases.update)) {
    return { ok: false, message: "You do not have permission to update invoices." };
  }

  const invoiceId = formData.get("invoiceId");
  const status = formData.get("status");
  if (typeof invoiceId !== "string" || invoiceId === "") {
    return { ok: false, message: "Missing invoice." };
  }
  if (typeof status !== "string" || !VALID_INVOICE_STATUS.includes(status)) {
    return { ok: false, message: "Invalid status." };
  }

  const client = await createClient();
  const { error } = await client.from("supplier_invoices").update({ status }).eq("id", invoiceId);

  if (error) {
    return { ok: false, message: message(error, "Could not update the invoice.") };
  }

  await writeAuditLog(session.userId, "update", "supplier_invoice", invoiceId, { status });

  return { ok: true, message: "Invoice updated." };
}

export async function createPurchasePaymentAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.purchases.create)) {
    return { ok: false, message: "You do not have permission to record payments." };
  }

  const supplierId = formData.get("supplierId");
  const invoiceId = formData.get("invoiceId");
  const purchaseOrderId = formData.get("purchaseOrderId");
  const amount = parseAmount(formData.get("amount"));
  const paymentDate = formData.get("paymentDate");
  const method = formData.get("method");
  const reference = formData.get("reference");
  const notes = formData.get("notes");

  if (typeof supplierId !== "string" || supplierId === "") {
    return { ok: false, message: "A supplier is required." };
  }
  if (amount === null || amount <= 0) {
    return { ok: false, message: "Enter a valid payment amount." };
  }
  if (typeof paymentDate !== "string" || paymentDate.trim() === "") {
    return { ok: false, message: "The payment date is required." };
  }
  if (typeof method !== "string" || !VALID_PAYMENT_METHODS.includes(method)) {
    return { ok: false, message: "Choose a valid payment method." };
  }

  const client = await createClient();
  const { data, error } = await client
    .from("purchase_payments")
    .insert({
      supplier_id: supplierId,
      invoice_id: typeof invoiceId === "string" && invoiceId !== "" ? invoiceId : null,
      purchase_order_id:
        typeof purchaseOrderId === "string" && purchaseOrderId !== ""
          ? purchaseOrderId
          : null,
      amount,
      payment_date: paymentDate.trim(),
      method,
      reference:
        typeof reference === "string" && reference.trim() !== "" ? reference.trim() : null,
      notes: typeof notes === "string" && notes.trim() !== "" ? notes.trim() : null,
      created_by: session.userId,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, message: message(error, "Could not record the payment.") };
  }

  await writeAuditLog(session.userId, "create", "purchase_payment", data.id, {
    supplierId,
    amount,
  });

  return { ok: true, message: "Payment recorded." };
}