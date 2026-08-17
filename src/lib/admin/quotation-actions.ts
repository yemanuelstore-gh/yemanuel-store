"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import type { ActionResult } from "@/components/admin/ui";
import { writeAuditLog } from "@/lib/admin/audit";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { nextDocumentNumber } from "@/lib/admin/doc-numbers";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { effectivePricing, pricingFor, roundMoney, type PriceRow } from "@/lib/pricing";
import { isValidGhanaPhone } from "@/lib/validation";
import {
  QUOTATION_TRANSITIONS,
  quotationStatusLabel,
  type QuotationStatus,
} from "./quotations";

/**
 * Quotation mutations.
 *
 * A quotation is a sales proposal: nothing here ever touches inventory,
 * stock movements, payments, customer balances or purchase records. Only
 * convertQuotationToOrderAction creates a legitimate ERP order, and even
 * that does not move stock — stock is consumed by the normal order
 * processing workflow.
 *
 * Every mutation re-checks the authenticated session + permission server
 * side, resolves the authoritative product pricing itself, and never trusts
 * client-supplied totals.
 */

const MAX_LINES = 30;
const MAX_QUANTITY = 999;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

type RawLine = { variantId: string; quantity: number; discount: number };

type ResolvedLine = {
  variantId: string;
  quantity: number;
  productName: string;
  variantName: string;
  sku: string;
  options: Record<string, string> | null;
  unitPrice: number;
  discountAmount: number;
  lineTotal: number;
  taxableAmount: number;
  taxRate: null;
  taxAmount: number;
};

type PriceRowWithRange = PriceRow & {
  valid_from: string;
  valid_to: string | null;
};

type VariantRow = {
  id: string;
  name: string;
  sku: string;
  options: Record<string, string> | null;
  status: string;
  product: { id: string; name: string; status: string } | null;
  prices: PriceRowWithRange[];
};

function currentPrices(rows: PriceRowWithRange[]): PriceRowWithRange[] {
  const now = Date.now();
  return rows.filter((price) => {
    const from = price.valid_from ? new Date(price.valid_from).getTime() : 0;
    const to = price.valid_to ? new Date(price.valid_to).getTime() : null;
    return from <= now && (to === null || to >= now);
  });
}

function parseDate(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const match = DATE_RE.exec(value.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return value.trim();
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function message(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "A quotation with this number already exists.";
    return fallback;
  }
  return fallback;
}

function parseLines(formData: FormData): RawLine[] | { error: string } {
  const lines: RawLine[] = [];
  for (let index = 0; index < MAX_LINES; index += 1) {
    const variantId = String(formData.get(`variantId-${index}`) ?? "").trim();
    if (variantId === "") break;
    const quantity = Number(formData.get(`quantity-${index}`) ?? "");
    const discount = Number(formData.get(`discount-${index}`) ?? "");
    if (!/^[0-9a-f-]{36}$/i.test(variantId)) {
      return { error: "An item in this quotation is invalid." };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
      return { error: `Item ${index + 1} has an invalid quantity.` };
    }
    if (!Number.isFinite(discount) || discount < 0) {
      return { error: `Item ${index + 1} has an invalid discount.` };
    }
    lines.push({ variantId, quantity, discount });
  }
  if (lines.length === 0) {
    return { error: "Add at least one item to the quotation." };
  }
  return lines;
}

async function resolveLines(
  lines: RawLine[],
): Promise<{ lines: ResolvedLine[]; subtotal: number } | { error: string }> {
  if (!isServiceConfigured()) {
    return { error: "Quotations are not available right now." };
  }
  const service = createServiceClient();
  const variantsResult = await service
    .from("product_variants")
    .select("id, name, sku, options, status, product:products(id, name, status), prices(price_type, amount, variant_id, valid_from, valid_to)")
    .in("id", lines.map((line) => line.variantId));
  if (variantsResult.error) {
    return { error: "Could not verify the quotation items. Please try again." };
  }
  const byId = new Map<string, VariantRow>();
  for (const row of (variantsResult.data ?? []) as unknown as VariantRow[]) {
    byId.set(row.id, row);
  }

  const resolved: ResolvedLine[] = [];
  let subtotal = 0;
  for (const line of lines) {
    const row = byId.get(line.variantId);
    if (!row || row.status !== "active" || row.product?.status !== "active") {
      return {
        error: "An item in this quotation is no longer available. Please review the items.",
      };
    }
    const effective = effectivePricing(
      pricingFor(currentPrices(row.prices ?? []), row.id),
    );
    if (effective.price === null) {
      return {
        error: `No selling price is set for ${row.product.name}.`,
      };
    }
    const unitPrice = roundMoney(effective.price);
    if (line.discount > unitPrice) {
      return {
        error: `The discount on ${row.product.name} exceeds its unit price.`,
      };
    }
    const lineTotal = roundMoney((unitPrice - line.discount) * line.quantity);
    resolved.push({
      variantId: row.id,
      quantity: line.quantity,
      productName: row.product.name,
      variantName: row.name,
      sku: row.sku,
      options: row.options,
      unitPrice,
      discountAmount: roundMoney(line.discount),
      lineTotal,
      taxableAmount: lineTotal,
      taxRate: null,
      taxAmount: 0,
    });
    subtotal = roundMoney(subtotal + lineTotal);
  }
  return { lines: resolved, subtotal };
}

function computeTotals(
  subtotal: number,
  discountTotal: number,
): { subtotal: number; discountTotal: number; taxableAmount: number; taxAmount: number; totalAmount: number } {
  if (discountTotal > subtotal) {
    throw new Error("Order discount exceeds the subtotal.");
  }
  const taxableAmount = roundMoney(subtotal - discountTotal);
  return {
    subtotal,
    discountTotal: roundMoney(discountTotal),
    taxableAmount,
    taxAmount: 0,
    totalAmount: roundMoney(taxableAmount),
  };
}

// ---------------------------------------------------------------------------
// Customer search for the quotation editor (customers.read gated + RLS).
// ---------------------------------------------------------------------------

export async function searchQuotationCustomersAction(
  q: string,
): Promise<{ id: string; name: string; phone: string }[]> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.customers.read)) return [];

  const client = await createClient();
  const term = q.trim();
  let query = client
    .from("customers")
    .select("id, first_name, last_name, business_name, phone")
    .eq("status", "active");

  if (term !== "") {
    const like = `%${term}%`;
    query = query.or(
      `first_name.ilike.${like},last_name.ilike.${like},business_name.ilike.${like},phone.ilike.${like}`,
    );
  }

  const { data } = await query.order("created_at", { ascending: false }).limit(8);
  return ((data ?? []) as unknown as {
    id: string;
    first_name: string;
    last_name: string;
    business_name: string | null;
    phone: string;
  }[]).map((row) => ({
    id: row.id,
    name: row.business_name?.trim()
      ? `${row.first_name} ${row.last_name} (${row.business_name})`
      : `${row.first_name} ${row.last_name}`,
    phone: row.phone,
  }));
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

type QuotationFormData = {
  customerId: string | null;
  guestName: string;
  guestPhone: string;
  quotationDate: string;
  validUntil: string;
  discountTotal: number;
  customerNotes: string;
  internalNotes: string;
  terms: string;
  paymentTerms: string;
  deliveryNotes: string;
};

function parseForm(formData: FormData): QuotationFormData | { error: string } {
  const customerId = String(formData.get("customerId") ?? "").trim();
  const guestName = String(formData.get("guestName") ?? "").trim();
  const guestPhone = String(formData.get("guestPhone") ?? "").trim();

  if (customerId !== "" && !/^[0-9a-f-]{36}$/i.test(customerId)) {
    return { error: "The selected customer is invalid." };
  }
  if (customerId === "" && guestName === "") {
    return { error: "Choose a customer or enter a walk-in guest name." };
  }
  if (guestPhone !== "" && !isValidGhanaPhone(guestPhone)) {
    return { error: "Enter a valid Ghana phone number for the guest (e.g. 024 412 3456)." };
  }

  const quotationDate = parseDate(formData.get("quotationDate"));
  const validUntil = parseDate(formData.get("validUntil"));
  if (!quotationDate || !validUntil) {
    return { error: "Enter valid quotation and valid-until dates." };
  }
  if (validUntil < quotationDate) {
    return { error: "The valid-until date cannot be before the quotation date." };
  }

  const rawDiscount = String(formData.get("discountTotal") ?? "").trim();
  const discountTotal = rawDiscount === "" ? 0 : Number(rawDiscount);
  if (!Number.isFinite(discountTotal) || discountTotal < 0) {
    return { error: "Enter a valid order discount." };
  }

  return {
    customerId: customerId === "" ? null : customerId,
    guestName,
    guestPhone,
    quotationDate,
    validUntil,
    discountTotal,
    customerNotes: String(formData.get("customerNotes") ?? "").trim(),
    internalNotes: String(formData.get("internalNotes") ?? "").trim(),
    terms: String(formData.get("terms") ?? "").trim(),
    paymentTerms: String(formData.get("paymentTerms") ?? "").trim(),
    deliveryNotes: String(formData.get("deliveryNotes") ?? "").trim(),
  };
}

async function validateCustomer(customerId: string | null): Promise<string | null> {
  if (customerId === null) return null;
  if (!isServiceConfigured()) return "Customers are not available right now.";
  const service = createServiceClient();
  const { data } = await service
    .from("customers")
    .select("id")
    .eq("id", customerId)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return "The selected customer is no longer active.";
  return null;
}

export async function createQuotationAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.create)) {
    return { ok: false, message: "You do not have the sales.create permission." };
  }

  const intent = formData.get("intent");
  if (intent === "save_send" && !hasPermission(session, PERMISSIONS.sales.update)) {
    return { ok: false, message: "You do not have the sales.update permission to send quotations." };
  }

  const parsed = parseForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const { customerId, guestName, guestPhone, quotationDate, validUntil, discountTotal, customerNotes, internalNotes, terms, paymentTerms, deliveryNotes } = parsed;

  const customerError = await validateCustomer(customerId);
  if (customerError) return { ok: false, message: customerError };

  const rawLines = parseLines(formData);
  if ("error" in rawLines) return { ok: false, message: rawLines.error };

  const resolved = await resolveLines(rawLines);
  if ("error" in resolved) return { ok: false, message: resolved.error };

  let totals: ReturnType<typeof computeTotals>;
  try {
    totals = computeTotals(resolved.subtotal, discountTotal);
  } catch {
    return { ok: false, message: "The order discount exceeds the quotation subtotal." };
  }

  const quotationNumber = await nextDocumentNumber("QT");

  const client = await createClient();
  const { data, error } = await client
    .from("quotations")
    .insert({
      quotation_number: quotationNumber,
      customer_id: customerId,
      guest_name: customerId ? null : guestName || null,
      guest_phone: customerId ? null : guestPhone || null,
      status: intent === "save_send" ? "sent" : "draft",
      quotation_date: quotationDate,
      valid_until: validUntil,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      taxable_amount: totals.taxableAmount,
      tax_amount: totals.taxAmount,
      tax_rate: null,
      total_amount: totals.totalAmount,
      customer_notes: customerNotes || null,
      internal_notes: internalNotes || null,
      terms: terms || null,
      payment_terms: paymentTerms || null,
      delivery_notes: deliveryNotes || null,
      status_changed_at: intent === "save_send" ? new Date().toISOString() : null,
      created_by: session.userId,
      updated_by: session.userId,
    })
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, message: message(error, "Could not create the quotation.") };
  }

  const itemsResult = await client.from("quotation_items").insert(
    resolved.lines.map((line, index) => ({
      quotation_id: data.id,
      variant_id: line.variantId,
      quantity: line.quantity,
      product_name: line.productName,
      variant_name: line.variantName,
      sku: line.sku,
      options: line.options,
      unit_price: line.unitPrice,
      discount_amount: line.discountAmount,
      line_total: line.lineTotal,
      taxable_amount: line.taxableAmount,
      tax_rate: line.taxRate,
      tax_amount: line.taxAmount,
      sort_order: index,
    })),
  );
  if (itemsResult.error) {
    await client.from("quotations").delete().eq("id", data.id);
    return { ok: false, message: message(itemsResult.error, "Could not record the quotation items.") };
  }

  await writeAuditLog(session.userId, "create", "quotation", data.id as string, {
    quotationNumber,
    amount: totals.totalAmount,
    itemCount: resolved.lines.length,
    customerId,
    status: intent === "save_send" ? "sent" : "draft",
  });

  revalidatePath("/admin/quotations");
  redirect(`/admin/quotations/${data.id}`);
}

// ---------------------------------------------------------------------------
// Update (draft and sent quotations remain editable)
// ---------------------------------------------------------------------------

export async function updateQuotationAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.update)) {
    return { ok: false, message: "You do not have the sales.update permission." };
  }

  const quotationId = String(formData.get("quotationId") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(quotationId)) {
    return { ok: false, message: "Missing quotation." };
  }

  const client = await createClient();
  const { data: current } = await client
    .from("quotations")
    .select("id, quotation_number, status")
    .eq("id", quotationId)
    .maybeSingle();
  if (!current) {
    return { ok: false, message: "Quotation not found." };
  }
  const currentStatus = current.status as QuotationStatus;
  if (currentStatus !== "draft" && currentStatus !== "sent") {
    return { ok: false, message: `A ${quotationStatusLabel(currentStatus)} quotation can no longer be edited.` };
  }

  const parsed = parseForm(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };
  const { customerId, guestName, guestPhone, quotationDate, validUntil, discountTotal, customerNotes, internalNotes, terms, paymentTerms, deliveryNotes } = parsed;

  const customerError = await validateCustomer(customerId);
  if (customerError) return { ok: false, message: customerError };

  const rawLines = parseLines(formData);
  if ("error" in rawLines) return { ok: false, message: rawLines.error };

  const resolved = await resolveLines(rawLines);
  if ("error" in resolved) return { ok: false, message: resolved.error };

  let totals: ReturnType<typeof computeTotals>;
  try {
    totals = computeTotals(resolved.subtotal, discountTotal);
  } catch {
    return { ok: false, message: "The order discount exceeds the quotation subtotal." };
  }

  const { error: headerError } = await client
    .from("quotations")
    .update({
      customer_id: customerId,
      guest_name: customerId ? null : guestName || null,
      guest_phone: customerId ? null : guestPhone || null,
      quotation_date: quotationDate,
      valid_until: validUntil,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      taxable_amount: totals.taxableAmount,
      tax_amount: totals.taxAmount,
      tax_rate: null,
      total_amount: totals.totalAmount,
      customer_notes: customerNotes || null,
      internal_notes: internalNotes || null,
      terms: terms || null,
      payment_terms: paymentTerms || null,
      delivery_notes: deliveryNotes || null,
      updated_by: session.userId,
    })
    .eq("id", quotationId);
  if (headerError) {
    return { ok: false, message: message(headerError, "Could not save the quotation.") };
  }

  const { error: deleteError } = await client
    .from("quotation_items")
    .delete()
    .eq("quotation_id", quotationId);
  if (deleteError) {
    return { ok: false, message: message(deleteError, "Could not replace the quotation items.") };
  }

  const itemsResult = await client.from("quotation_items").insert(
    resolved.lines.map((line, index) => ({
      quotation_id: quotationId,
      variant_id: line.variantId,
      quantity: line.quantity,
      product_name: line.productName,
      variant_name: line.variantName,
      sku: line.sku,
      options: line.options,
      unit_price: line.unitPrice,
      discount_amount: line.discountAmount,
      line_total: line.lineTotal,
      taxable_amount: line.taxableAmount,
      tax_rate: line.taxRate,
      tax_amount: line.taxAmount,
      sort_order: index,
    })),
  );
  if (itemsResult.error) {
    return { ok: false, message: message(itemsResult.error, "Could not record the quotation items.") };
  }

  await writeAuditLog(session.userId, "update", "quotation", quotationId, {
    quotationNumber: current.quotation_number,
    amount: totals.totalAmount,
    itemCount: resolved.lines.length,
  });

  revalidatePath("/admin/quotations");
  redirect(`/admin/quotations/${quotationId}`);
}

// ---------------------------------------------------------------------------
// Status transitions: draft -> sent/rejected, sent -> accepted/rejected
// ---------------------------------------------------------------------------

export async function setQuotationStatusAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.update)) {
    return { ok: false, message: "You do not have the sales.update permission." };
  }

  const quotationId = String(formData.get("quotationId") ?? "").trim();
  const target = String(formData.get("targetStatus") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(quotationId)) {
    return { ok: false, message: "Missing quotation." };
  }
  if (!["sent", "accepted", "rejected"].includes(target)) {
    return { ok: false, message: "Invalid status transition." };
  }

  const client = await createClient();
  const { data: current } = await client
    .from("quotations")
    .select("id, quotation_number, status, valid_until")
    .eq("id", quotationId)
    .maybeSingle();
  if (!current) {
    return { ok: false, message: "Quotation not found." };
  }

  const status = current.status as QuotationStatus;
  const today = todayUtc();
  if ((status === "draft" || status === "sent") && current.valid_until < today) {
    await client
      .from("quotations")
      .update({ status: "expired", status_changed_at: new Date().toISOString() })
      .eq("id", quotationId);
    return { ok: false, message: "This quotation has expired and can no longer be changed." };
  }

  const allowed = QUOTATION_TRANSITIONS[status] ?? [];
  if (!allowed.includes(target as QuotationStatus)) {
    return {
      ok: false,
      message: `A ${quotationStatusLabel(status)} quotation cannot be marked as ${quotationStatusLabel(target)}.`,
    };
  }

  if (target === "accepted" && current.valid_until < today) {
    return { ok: false, message: "This quotation has expired and cannot be accepted." };
  }

  const { error } = await client
    .from("quotations")
    .update({
      status: target,
      status_changed_at: new Date().toISOString(),
      updated_by: session.userId,
    })
    .eq("id", quotationId);
  if (error) {
    return { ok: false, message: message(error, "Could not update the quotation status.") };
  }

  await writeAuditLog(session.userId, target === "accepted" ? "accept" : target === "rejected" ? "reject" : "status_change", "quotation", quotationId, {
    quotationNumber: current.quotation_number,
    from: status,
    to: target,
  });

  revalidatePath("/admin/quotations");
  return { ok: true, message: `Quotation marked as ${quotationStatusLabel(target)}.` };
}

// ---------------------------------------------------------------------------
// Convert to order (idempotent, never deducts stock)
// ---------------------------------------------------------------------------

export async function convertQuotationToOrderAction(
  prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.update)) {
    return { ok: false, message: "You do not have the sales.update permission." };
  }
  if (!isServiceConfigured()) {
    return { ok: false, message: "Orders are not available right now." };
  }
  const service = createServiceClient();

  const quotationId = String(formData.get("quotationId") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(quotationId)) {
    return { ok: false, message: "Missing quotation." };
  }

  const { data: quotation, error: quotationError } = await service
    .from("quotations")
    .select(
      "id, quotation_number, status, customer_id, guest_name, guest_phone, subtotal, discount_total, taxable_amount, tax_amount, tax_rate, total_amount, valid_until, converted_order_id",
    )
    .eq("id", quotationId)
    .maybeSingle();
  if (quotationError || !quotation) {
    return { ok: false, message: "Quotation not found." };
  }
  const row = quotation as unknown as {
    id: string;
    quotation_number: string;
    status: QuotationStatus;
    customer_id: string | null;
    guest_name: string | null;
    guest_phone: string | null;
    subtotal: number;
    discount_total: number;
    taxable_amount: number;
    tax_amount: number;
    tax_rate: number | null;
    total_amount: number;
    valid_until: string;
    converted_order_id: string | null;
  };

  if (row.converted_order_id !== null) {
    return {
      ok: true,
      message: "This quotation has already been converted to an order.",
    };
  }
  if (row.status !== "accepted") {
    return {
      ok: false,
      message: `Only accepted quotations can be converted (current status: ${quotationStatusLabel(row.status)}).`,
    };
  }
  if (row.valid_until < todayUtc()) {
    return { ok: false, message: "This quotation has expired and cannot be converted." };
  }

  const { data: itemsResult } = await service
    .from("quotation_items")
    .select("variant_id, quantity, product_name, variant_name, sku, options, unit_price, discount_amount, line_total, taxable_amount, tax_rate, tax_amount")
    .eq("quotation_id", quotationId)
    .order("sort_order", { ascending: true });
  const items = (itemsResult ?? []) as unknown as {
    variant_id: string | null;
    quantity: number;
    product_name: string;
    variant_name: string;
    sku: string;
    options: Record<string, string> | null;
    unit_price: number;
    discount_amount: number;
    line_total: number;
    taxable_amount: number;
    tax_rate: number | null;
    tax_amount: number;
  }[];
  if (items.length === 0) {
    return { ok: false, message: "This quotation has no items to convert." };
  }

  const { data: locationResult } = await service
    .from("locations")
    .select("id")
    .eq("status", "active")
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!locationResult) {
    return { ok: false, message: "No active store location exists for the order." };
  }

  let customer: {
    first_name: string;
    last_name: string;
    business_name: string | null;
    phone: string;
  } | null = null;
  if (row.customer_id !== null) {
    const { data: customerResult } = await service
      .from("customers")
      .select("first_name, last_name, business_name, phone")
      .eq("id", row.customer_id)
      .maybeSingle();
    const customerRow = customerResult as unknown as {
      first_name: string;
      last_name: string;
      business_name: string | null;
      phone: string;
    } | null;
    if (customerRow) customer = customerRow;
  }

  const orderNumber = await nextDocumentNumber("SO");
  const orderId = randomUUID();
  const recipient = customer ? `${customer.first_name} ${customer.last_name}`.trim() : row.guest_name;
  const phone = customer?.phone ?? row.guest_phone;

  const orderInsert = {
    id: orderId,
    order_number: orderNumber,
    customer_id: row.customer_id,
    channel: "in_store",
    status: "confirmed",
    payment_status: "unpaid",
    fulfilment_status: "unfulfilled",
    location_id: (locationResult as { id: string }).id,
    guest_name: row.customer_id ? null : row.guest_name,
    guest_phone: row.customer_id ? null : row.guest_phone,
    guest_email: null,
    bill_to_recipient: recipient,
    bill_to_phone: phone,
    bill_to_address_line_1: null,
    bill_to_address_line_2: null,
    bill_to_city: null,
    bill_to_region: null,
    delivery_method_name: null,
    delivery_fee: 0,
    subtotal: row.subtotal,
    discount_total: row.discount_total,
    taxable_amount: row.taxable_amount,
    tax_amount: row.tax_amount,
    tax_rate: row.tax_rate,
    total_amount: row.total_amount,
    notes: `Created from quotation ${row.quotation_number}`,
    created_by: session.userId,
  };

  const orderResult = await service.from("orders").insert(orderInsert).select("id");
  if (orderResult.error) {
    return { ok: false, message: message(orderResult.error, "Could not create the order.") };
  }

  const itemsInsert = await service.from("order_items").insert(
    items.map((item) => ({
      order_id: orderId,
      variant_id: item.variant_id,
      quantity: item.quantity,
      product_name: item.product_name,
      variant_name: item.variant_name,
      sku: item.sku,
      options: item.options,
      unit_price: item.unit_price,
      unit_cost: null,
      discount_amount: item.discount_amount,
      line_total: item.line_total,
      taxable_amount: item.taxable_amount,
      tax_rate: item.tax_rate,
      tax_amount: item.tax_amount,
    })),
  );
  if (itemsInsert.error) {
    await service.from("orders").delete().eq("id", orderId);
    return { ok: false, message: message(itemsInsert.error, "Could not create the order items.") };
  }

  // Idempotency guard: only one conversion may win. If a concurrent request
  // converted this quotation first, this order is discarded.
  const { data: linked, error: linkError } = await service
    .from("quotations")
    .update({ converted_order_id: orderId, updated_by: session.userId })
    .eq("id", quotationId)
    .is("converted_order_id", null)
    .select("converted_order_id");

  if (linkError) {
    await service.from("orders").delete().eq("id", orderId);
    return { ok: false, message: message(linkError, "Could not link the order to the quotation.") };
  }
  if (!linked || (linked as unknown as { converted_order_id: string | null }[]).length !== 1) {
    await service.from("orders").delete().eq("id", orderId);
    return { ok: true, message: "This quotation has already been converted to an order." };
  }

  await writeAuditLog(session.userId, "convert", "quotation", quotationId, {
    quotationNumber: row.quotation_number,
    orderId,
    orderNumber,
    amount: Number(row.total_amount),
  });

  revalidatePath("/admin/quotations");
  revalidatePath("/admin/orders");
  return { ok: true, message: `Order ${orderNumber} created from this quotation.` };
}