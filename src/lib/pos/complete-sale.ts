"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/admin/audit";
import { hasPermission, getAdminSession } from "@/lib/admin/session";
import { PERMISSIONS } from "@/lib/admin/permissions";
import { nextDocumentNumber } from "@/lib/admin/doc-numbers";
import { findOrCreateInventoryItem, recordStockMovement } from "@/lib/admin/stock-ledger";
import { createServiceClient, isServiceConfigured } from "@/lib/supabase/service";
import { effectivePricing, pricingFor, roundMoney, type PriceRow } from "@/lib/pricing";
import { makePaymentReference } from "@/lib/payments/references";
import { recalculateOrderPaymentStatus } from "@/lib/payments/record";
import { atomicallyDeductStock, restoreStock } from "./stock";
import { coversTotal, changeDue } from "./format";
import type { PosReceipt, PosSaleResult } from "./types";
import { POS_MAX_LINES, POS_MAX_QUANTITY, POS_PAYMENT_METHODS } from "./types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PriceRowWithRange = PriceRow & {
  valid_from: string;
  valid_to: string | null;
};

type VariantRow = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
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

function friendlyError(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const text = String((error as { message: string }).message);
    if (text.includes("duplicate key")) return "This sale was already recorded.";
    if (text.includes("violates foreign key")) return "A reference in this sale does not exist.";
    return fallback;
  }
  return fallback;
}

type SaleContext = {
  orderId: string;
  orderNumber: string;
  locationId: string;
  customerId: string | null;
  guestName: string | null;
  guestPhone: string | null;
  lines: {
    variantId: string;
    productName: string;
    variantName: string;
    sku: string;
    options: Record<string, string> | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  subtotal: number;
  totalAmount: number;
  paymentMethod: string;
  change: number;
};

/**
 * Complete a POS sale.
 *
 * Authorization: sales.create (checked here — never trust the UI).
 * Idempotency: the client-generated `requestId` is used as the order id, so
 * double clicks / network retries can never create a second order. A retry
 * against an already-paid order returns the original receipt; a retry after
 * a partial failure reconciles the missing pieces (stock, payment) instead
 * of duplicating them.
 *
 * Stock is deducted with the POS atomic compare-and-swap helper — never
 * with the shared read-then-write applyQuantityDelta().
 */
export async function completePosSaleAction(
  prev: PosSaleResult | null,
  formData: FormData,
): Promise<PosSaleResult> {
  const session = await getAdminSession();
  if (!session || !hasPermission(session, PERMISSIONS.sales.create)) {
    return { ok: false, message: "You do not have the sales.create permission." };
  }
  if (!isServiceConfigured()) {
    return { ok: false, message: "Sales are not available right now." };
  }
  const service = createServiceClient();

  const requestId = String(formData.get("requestId") ?? "").trim();
  if (!UUID_RE.test(requestId)) {
    return { ok: false, message: "This sale session is invalid. Please start a new sale." };
  }

  const locationId = String(formData.get("locationId") ?? "").trim();
  if (!UUID_RE.test(locationId)) {
    return { ok: false, message: "Choose a valid store location." };
  }

  const paymentMethod = String(formData.get("paymentMethod") ?? "").trim();
  if (!POS_PAYMENT_METHODS.includes(paymentMethod as (typeof POS_PAYMENT_METHODS)[number])) {
    return { ok: false, message: "Choose a valid payment method." };
  }

  const customerIdRaw = String(formData.get("customerId") ?? "").trim();
  const customerId = customerIdRaw === "" ? null : customerIdRaw;
  if (customerId !== null && !UUID_RE.test(customerId)) {
    return { ok: false, message: "The selected customer is invalid." };
  }
  const guestName = String(formData.get("guestName") ?? "").trim() || null;
  const guestPhone = String(formData.get("guestPhone") ?? "").trim() || null;

  const rawTendered = String(formData.get("cashTendered") ?? "").trim();
  const cashTendered = rawTendered === "" ? null : Number(rawTendered);
  if (paymentMethod === "cash" && (cashTendered === null || !Number.isFinite(cashTendered))) {
    return { ok: false, message: "Enter the cash tendered." };
  }

  const lines: { variantId: string; quantity: number }[] = [];
  for (let index = 0; index < POS_MAX_LINES; index += 1) {
    const variantId = String(formData.get(`variantId-${index}`) ?? "").trim();
    const quantity = Number(formData.get(`quantity-${index}`) ?? "");
    if (variantId === "") break;
    if (!UUID_RE.test(variantId)) {
      return { ok: false, message: "An item in this sale is invalid." };
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > POS_MAX_QUANTITY) {
      return { ok: false, message: "An item quantity in this sale is invalid." };
    }
    lines.push({ variantId, quantity });
  }
  if (lines.length === 0) {
    return { ok: false, message: "Add at least one item to the sale." };
  }

  const locationResult = await service
    .from("locations")
    .select("id, name")
    .eq("id", locationId)
    .eq("status", "active")
    .maybeSingle();
  if (locationResult.error || !locationResult.data) {
    return { ok: false, message: "Choose a valid store location." };
  }

  let customerName: string | null = null;
  let customerPhone: string | null = null;
  if (customerId !== null) {
    const customerResult = await service
      .from("customers")
      .select("id, first_name, last_name, phone")
      .eq("id", customerId)
      .eq("status", "active")
      .maybeSingle();
    if (customerResult.error || !customerResult.data) {
      return { ok: false, message: "The selected customer is no longer active." };
    }
    const row = customerResult.data as unknown as {
      first_name: string;
      last_name: string;
      phone: string;
    };
    customerName = `${row.first_name} ${row.last_name}`.trim();
    customerPhone = row.phone;
  }

  // -----------------------------------------------------------------------
  // Idempotency: has this request already produced an order?
  // -----------------------------------------------------------------------
  const existingResult = await service
    .from("orders")
    .select("id, order_number, total_amount, payment_status")
    .eq("id", requestId)
    .maybeSingle();

  if (existingResult.data) {
    const existing = existingResult.data as unknown as {
      id: string;
      order_number: string;
      total_amount: number;
      payment_status: string;
    };
    const paidPayment = await findPaidPayment(service, existing.id);
    if (paidPayment) {
      return {
        ok: true,
        receipt: await buildReceipt(service, session, existing.id, cashTendered),
      };
    }
    // Order exists but the sale never completed — reconcile stock + payment.
    await applyStockAndPayment({
      orderId: existing.id,
      orderNumber: existing.order_number,
      locationId,
      lines,
      totalAmount: Number(existing.total_amount),
      paymentMethod,
      cashTendered,
      session,
      service,
      reconcile: true,
    });
    return {
      ok: true,
      receipt: await buildReceipt(service, session, existing.id, cashTendered),
    };
  }

  // -----------------------------------------------------------------------
  // Resolve variants and recompute every total server-side.
  // -----------------------------------------------------------------------
  const variantsResult = await service
    .from("product_variants")
    .select("id, name, sku, barcode, options, status, product:products(id, name, status), prices(price_type, amount, variant_id, valid_from, valid_to)")
    .in("id", lines.map((line) => line.variantId));
  if (variantsResult.error) {
    return { ok: false, message: "Could not verify the sale items. Please try again." };
  }

  const variantsById = new Map<string, VariantRow>();
  for (const row of (variantsResult.data ?? []) as unknown as VariantRow[]) {
    variantsById.set(row.id, row);
  }

  const resolved: SaleContext["lines"] = [];
  for (const line of lines) {
    const row = variantsById.get(line.variantId);
    if (!row || row.status !== "active" || row.product?.status !== "active") {
      return {
        ok: false,
        message: "An item in this sale is no longer available. Please review the sale.",
      };
    }
    const effective = effectivePricing(pricingFor(currentPrices(row.prices ?? []), row.id));
    if (effective.price === null) {
      return {
        ok: false,
        message: `No selling price is set for ${row.product.name}. Please review the sale.`,
      };
    }
    const unitPrice = roundMoney(effective.price);
    resolved.push({
      variantId: row.id,
      productName: row.product.name,
      variantName: row.name,
      sku: row.sku,
      options: row.options,
      quantity: line.quantity,
      unitPrice,
      lineTotal: roundMoney(unitPrice * line.quantity),
    });
  }

  const subtotal = roundMoney(
    resolved.reduce((total, line) => total + line.lineTotal, 0),
  );
  const totalAmount = subtotal;

  if (paymentMethod === "cash" && !coversTotal(cashTendered as number, totalAmount)) {
    return {
      ok: false,
      message: "Cash tendered is below the amount due.",
    };
  }

  // -----------------------------------------------------------------------
  // Create the order (id = requestId for idempotency) and its items.
  // -----------------------------------------------------------------------
  const orderNumber = await nextDocumentNumber("SO");
  const recipient = customerName ?? guestName;
  const phone = customerPhone ?? guestPhone;

  const orderInsert = {
    id: requestId,
    order_number: orderNumber,
    customer_id: customerId,
    channel: "in_store",
    status: "processing",
    payment_status: "unpaid",
    fulfilment_status: "fulfilled",
    location_id: locationId,
    guest_name: customerId ? null : guestName,
    guest_phone: customerId ? null : guestPhone,
    guest_email: null,
    bill_to_recipient: recipient,
    bill_to_phone: phone,
    bill_to_address_line_1: null,
    bill_to_address_line_2: null,
    bill_to_city: null,
    bill_to_region: null,
    delivery_method_name: null,
    delivery_fee: 0,
    subtotal,
    discount_total: 0,
    taxable_amount: 0,
    tax_amount: 0,
    tax_rate: null,
    total_amount: totalAmount,
    notes: null,
    created_by: session.userId,
  };

  const orderResult = await service.from("orders").insert(orderInsert).select("id");
  if (orderResult.error) {
    if (orderResult.error.code === "23505") {
      const raced = await service
        .from("orders")
        .select("id, order_number")
        .eq("id", requestId)
        .maybeSingle();
      if (raced.data) {
        const paidPayment = await findPaidPayment(service, requestId);
        if (paidPayment) {
          return {
            ok: true,
            receipt: await buildReceipt(service, session, requestId, cashTendered),
          };
        }
      }
    }
    return { ok: false, message: friendlyError(orderResult.error, "Could not record the sale.") };
  }

  const itemsResult = await service.from("order_items").insert(
    resolved.map((line) => ({
      order_id: requestId,
      variant_id: line.variantId,
      quantity: line.quantity,
      product_name: line.productName,
      variant_name: line.variantName,
      sku: line.sku,
      options: line.options,
      unit_price: line.unitPrice,
      unit_cost: null,
      discount_amount: 0,
      line_total: line.lineTotal,
      taxable_amount: 0,
      tax_rate: null,
      tax_amount: 0,
    })),
  );
  if (itemsResult.error) {
    await service.from("orders").delete().eq("id", requestId);
    return { ok: false, message: friendlyError(itemsResult.error, "Could not record the sale items.") };
  }

  // -----------------------------------------------------------------------
  // Atomically deduct stock and journal every movement.
  // -----------------------------------------------------------------------
  const stockStep = await applyStockAndPayment({
    orderId: requestId,
    orderNumber,
    locationId,
    lines: resolved,
    totalAmount,
    paymentMethod,
    cashTendered,
    session,
    service,
    reconcile: false,
  });
  if (!stockStep.ok) {
    await service.from("orders").delete().eq("id", requestId);
    return { ok: false, message: stockStep.message };
  }

  // -----------------------------------------------------------------------
  // Audit + refresh + receipt.
  // -----------------------------------------------------------------------
  await writeAuditLog(session.userId, "create", "order", requestId, {
    orderNumber,
    channel: "in_store",
    paymentMethod,
    amount: totalAmount,
    itemCount: resolved.length,
    locationId,
    customerId,
  });

  revalidatePath("/admin/pos");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/payments");
  revalidatePath("/admin/inventory");

  return {
    ok: true,
    receipt: await buildReceipt(service, session, requestId, cashTendered),
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

type PaymentContext = {
  orderId: string;
  orderNumber: string;
  locationId: string;
  lines: { variantId: string; quantity: number }[];
  totalAmount: number;
  paymentMethod: string;
  cashTendered: number | null;
  session: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>;
  service: ReturnType<typeof createServiceClient>;
  reconcile: boolean;
};

async function findPaidPayment(
  service: ReturnType<typeof createServiceClient>,
  orderId: string,
): Promise<{ id: string } | null> {
  const { data } = await service
    .from("payments")
    .select("id")
    .eq("order_id", orderId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle();
  return data as { id: string } | null;
}

/**
 * Deduct stock (once per order) and record the paid payment (once per order).
 * Idempotent across retries: stock is only deducted when no sale movement
 * exists for the order, and a payment is only inserted when no paid payment
 * exists. On failure, already-deducted lines are restored and the movement
 * journal entries for the order are removed so a retry starts clean.
 */
async function applyStockAndPayment(context: PaymentContext): Promise<
  | { ok: true }
  | { ok: false; message: string }
> {
  const { service, orderId, locationId, lines, totalAmount, paymentMethod, cashTendered, session, orderNumber, reconcile } = context;

  const movementsResult = await service
    .from("stock_movements")
    .select("id")
    .eq("source_type", "order")
    .eq("source_id", orderId)
    .limit(1)
    .maybeSingle();

  const stockAlreadyDeducted =
    !movementsResult.error && movementsResult.data !== null;

  const deducted: { inventoryItemId: string; quantity: number }[] = [];

  if (!stockAlreadyDeducted) {
    for (const line of lines) {
      const inventory = await findOrCreateInventoryItem(service, locationId, line.variantId);
      if (!inventory.item) {
        for (const entry of deducted) {
          await restoreStock(service, entry.inventoryItemId, entry.quantity);
        }
        return { ok: false, message: "Stock could not be resolved for an item in this sale." };
      }

      const deduction = await atomicallyDeductStock(service, inventory.item.id, line.quantity);
      if (!deduction.ok) {
        for (const entry of deducted) {
          await restoreStock(service, entry.inventoryItemId, entry.quantity);
        }
        return { ok: false, message: deduction.message };
      }
      deducted.push({ inventoryItemId: inventory.item.id, quantity: line.quantity });

      const movement = await recordStockMovement(service, {
        inventoryItemId: inventory.item.id,
        movementType: "sale",
        quantityChange: -line.quantity,
        unitCost:
          inventory.item.average_cost === null || inventory.item.average_cost === 0
            ? null
            : Number(inventory.item.average_cost),
        sourceType: "order",
        sourceId: orderId,
        note: orderNumber,
        createdBy: session.userId,
      });
      if (!movement.ok) {
        for (const entry of deducted) {
          await restoreStock(service, entry.inventoryItemId, entry.quantity);
        }
        return { ok: false, message: "Could not record the stock movement for this sale." };
      }
    }
  }

  if (!reconcile) {
    // Keep the item cost snapshot in sync with what the ledger consumed.
    for (const line of lines) {
      const inventory = await findOrCreateInventoryItem(service, locationId, line.variantId);
      if (inventory.item && Number(inventory.item.average_cost) > 0) {
        await service
          .from("order_items")
          .update({ unit_cost: Number(inventory.item.average_cost) })
          .eq("order_id", orderId)
          .eq("variant_id", line.variantId);
      }
    }
  }

  const paidPayment = await findPaidPayment(service, orderId);
  if (!paidPayment) {
    const change = paymentMethod === "cash" && cashTendered !== null ? changeDue(cashTendered, totalAmount) : 0;
    const { error: paymentError } = await service.from("payments").insert({
      order_id: orderId,
      amount: totalAmount,
      method: paymentMethod,
      status: "paid",
      payment_date: new Date().toISOString(),
      reference: makePaymentReference(),
      notes: change > 0 ? `POS sale — change GH₵${change.toFixed(2)}` : "POS sale",
      received_by: session.staff.id,
    });
    if (paymentError) {
      for (const entry of deducted) {
        await restoreStock(service, entry.inventoryItemId, entry.quantity);
      }
      await service
        .from("stock_movements")
        .delete()
        .eq("source_type", "order")
        .eq("source_id", orderId);
      return { ok: false, message: "The payment could not be recorded. No sale was completed." };
    }
  }

  const paymentStatus = await recalculateOrderPaymentStatus(orderId);
  if (paymentStatus !== "paid") {
    console.error("[pos] unexpected payment status after sale", {
      orderId,
      paymentStatus,
    });
  }

  return { ok: true };
}

async function buildReceipt(
  service: ReturnType<typeof createServiceClient>,
  session: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>,
  orderId: string,
  cashTendered: number | null,
): Promise<PosReceipt> {
  const { data, error } = await service
    .from("orders")
    .select(
      `
      order_number, created_at, subtotal, discount_total, total_amount, guest_name,
      customers(first_name, last_name),
      order_items(product_name, variant_name, sku, quantity, unit_price, line_total),
      payments(method, reference, amount, status)
    `,
    )
    .eq("id", orderId)
    .maybeSingle();

  const row = data as unknown as {
    order_number: string;
    created_at: string;
    subtotal: number;
    discount_total: number;
    total_amount: number;
    guest_name: string | null;
    customers: { first_name: string; last_name: string } | null;
    order_items: {
      product_name: string;
      variant_name: string;
      sku: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }[];
    payments: {
      method: string;
      reference: string | null;
      amount: number;
      status: string;
    }[];
  };

  if (error || !row) {
    return {
      orderId,
      orderNumber: "",
      createdAt: new Date().toISOString(),
      cashierName: session.fullName ?? session.email,
      customerName: null,
      items: [],
      subtotal: 0,
      discountTotal: 0,
      totalAmount: 0,
      paymentMethod: "",
      amountPaid: 0,
      change: 0,
      paymentReference: "",
    };
  }

  const payment = (row.payments ?? []).find((candidate) => candidate.status === "paid");

  return {
    orderId,
    orderNumber: row.order_number,
    createdAt: row.created_at,
    cashierName: session.fullName ?? session.email,
    customerName: row.customers
      ? `${row.customers.first_name} ${row.customers.last_name}`.trim()
      : row.guest_name,
    items: (row.order_items ?? []).map((item) => ({
      productName: item.product_name,
      variantName: item.variant_name,
      sku: item.sku,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unit_price),
      lineTotal: Number(item.line_total),
    })),
    subtotal: Number(row.subtotal),
    discountTotal: Number(row.discount_total),
    totalAmount: Number(row.total_amount),
    paymentMethod: payment?.method ?? "",
    amountPaid: payment ? Number(payment.amount) : 0,
    change:
      payment?.method === "cash" && cashTendered !== null
        ? changeDue(cashTendered, Number(row.total_amount))
        : 0,
    paymentReference: payment?.reference ?? "",
  };
}