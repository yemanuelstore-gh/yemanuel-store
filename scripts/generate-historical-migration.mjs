// Historical transaction seed migration generator for Yemanuel Store.
//
// Reads scripts/historical-data/*.json (produced by
// scripts/generate-historical-transactions.mjs) and emits one idempotent
// migration: supabase/migrations/20260818010000_historical_transactions.sql
//
// The migration is safe to run more than once:
//   - every row carries a deterministic id (uuid5 over a stable namespace), so
//     `on conflict (id) do nothing` re-runs cleanly;
//   - parent documents keep their unique number columns, children reference
//     parents by deterministic id, so a partially applied migration converges;
//   - document sequences (SO/PO/GR/RET/RFD/EXP/AT/SUP) are advanced past the
//     seeded numbers so live document creation never collides.
//
// Run: node scripts/generate-historical-migration.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;
const dataDir = `${root}/scripts/historical-data`;
const outFile = `${root}/supabase/migrations/20260818010000_historical_transactions.sql`;

const readJson = (name) => JSON.parse(readFileSync(`${dataDir}/${name}`, "utf8"));
const master = readJson("master.json");
const orders = readJson("orders.json");
const purchases = readJson("purchases.json");
const finance = readJson("finance.json");

const meta = master.meta;
const BANK_ID = meta.bankAccountId;
const MOMO_ID = meta.momoAccountId;
const SUPPLIERS_FROM_LIVE = meta.suppliersFromLive === true;

// ---------------------------------------------------------------------------
// SQL helpers
// ---------------------------------------------------------------------------
function sqlStr(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}
function sqlOrNull(value) {
  return value === null || value === undefined || value === "" ? "NULL" : sqlStr(value);
}
function sqlNum(value) {
  if (value === null || value === undefined) return "NULL";
  const n = Number(value);
  if (!Number.isFinite(n)) return "NULL";
  return String(Math.round(n * 100) / 100);
}
function sqlBool(value) {
  return value ? "true" : "false";
}
function sqlTs(value) {
  if (value === null || value === undefined) return "NULL";
  const iso = new Date(String(value)).toISOString().replace(/\.\d{3}Z$/, "Z");
  return sqlStr(iso);
}
function sqlJson(value) {
  if (value === null || value === undefined) return "NULL";
  return `${sqlStr(JSON.stringify(value))}::jsonb`;
}

function batchInsert(table, columns, rows, conflict = "id") {
  const colSql = `(${columns.join(", ")})`;
  const parts = [];
  const BATCH = 400;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const values = chunk.map((row) => `(${row.join(", ")})`).join(",\n    ");
    parts.push(
      `insert into public.${table} ${colSql}\nvalues\n  ${values}\non conflict (${conflict}) do nothing;`,
    );
  }
  return parts.join("\n\n");
}

// Deterministic UUID v5-style, mirroring the generator.
const UUID_NS = "7c1d0f62-9f4e-4b1a-9d1a-1c0a0f0f0f0f";
function uuid5(name) {
  const h = createHash("sha1").update(`${UUID_NS}${name}`, "utf8").digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.toString("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

// ---------------------------------------------------------------------------
// order_items + return item order_item_id resolution
// ---------------------------------------------------------------------------
const orderItemIdByRef = new Map();
const orderItemRows = [];
for (const order of orders.orders) {
  order.lines.forEach((line, idx) => {
    const id = uuid5(`oi:${order.id}:${idx}`);
    orderItemIdByRef.set(`${order.id}:${line.variantId}:${idx}`, id);
    orderItemRows.push([
      sqlStr(id),
      sqlStr(order.id),
      sqlStr(line.variantId),
      sqlNum(line.quantity),
      sqlStr(line.productName),
      sqlStr(line.variantName),
      sqlStr(line.sku),
      sqlJson(line.options),
      sqlNum(line.unitPrice),
      sqlNum(line.unitCost),
      0,
      sqlNum(line.lineTotal),
      0,
      "NULL",
      0,
      sqlTs(order.createdAt),
      sqlTs(order.createdAt),
    ]);
  });
}

// ---------------------------------------------------------------------------
// account_transactions account-id mapping
// ---------------------------------------------------------------------------
const acctRows = [];
for (const t of finance.accountTransactions) {
  const isTransfer = t.transactionType === "transfer";
  const primaryKind =
    t.fromKind ?? (t.transactionType === "deposit" ? t.toKind : null);
  const accountBank = primaryKind === "bank" ? sqlStr(BANK_ID) : "NULL";
  const accountMomo = primaryKind === "momo" ? sqlStr(MOMO_ID) : "NULL";
  const transferBank = isTransfer && t.toKind === "bank" ? sqlStr(BANK_ID) : "NULL";
  const transferMomo = isTransfer && t.toKind === "momo" ? sqlStr(MOMO_ID) : "NULL";
  acctRows.push([
    sqlStr(t.id),
    sqlStr(t.transactionCode),
    sqlStr(t.transactionType),
    accountBank,
    accountMomo,
    transferBank,
    transferMomo,
    sqlStr(t.dateStr),
    sqlNum(t.amount),
    sqlOrNull(t.reference),
    sqlOrNull(t.note),
    sqlStr(t.createdBy),
    sqlTs(t.createdAt),
  ]);
}

// ---------------------------------------------------------------------------
// Sequence advancement
// ---------------------------------------------------------------------------
function maxSuffix(items, numberKey) {
  let max = 0;
  for (const item of items) {
    const num = String(item[numberKey]);
    const idx = num.lastIndexOf("-");
    if (idx >= 0) max = Math.max(max, parseInt(num.slice(idx + 1), 10) || 0);
  }
  return max;
}

const seqTargets = [
  ["so", maxSuffix(orders.orders, "orderNumber")],
  ["po", maxSuffix(purchases.purchaseOrders, "poNumber")],
  ["gr", maxSuffix(purchases.goodsReceipts, "receiptNumber")],
  ["ret", maxSuffix(orders.returns, "returnNumber")],
  ["rf", maxSuffix(orders.refunds, "refundNumber")],
  ["exp", maxSuffix(finance.expenses, "expenseNumber")],
  ["at", maxSuffix(finance.accountTransactions, "transactionCode")],
  ["sup", maxSuffix(master.suppliers, "supplierCode")],
];

const seqSql = seqTargets
  .filter(([, max]) => max > 0)
  .map(
    ([prefix, max]) =>
      `select setval('app.seq_${prefix}', greatest((select last_value from app.seq_${prefix}), ${max}));`,
  )
  .join("\n");

// ---------------------------------------------------------------------------
// Build the migration
// ---------------------------------------------------------------------------
const parts = [];

parts.push(`-- Historical transaction dataset for Yemanuel Store.
--
-- Covers 2022-01-01 through 2026-08-17: sales (orders, order items, payments,
-- deliveries), returns/refunds, purchasing (suppliers, purchase orders, goods
-- receipts, supplier invoices, purchase payments), inventory (stock movement
-- journal incl. opening counts), expenses, and bank / mobile-money account
-- transactions.
--
-- Generated by scripts/generate-historical-migration.mjs from the validated
-- deterministic dataset in scripts/historical-data/*.json (seed 20260818).
-- Do not edit by hand.
--
-- Idempotent: every row has a deterministic id and all inserts use
-- on conflict (id) do nothing, so the migration can be re-run safely. Document
-- sequences are advanced past the seeded numbers so live document creation
-- never collides with the historical dataset.
${
  SUPPLIERS_FROM_LIVE
    ? `--
-- Suppliers are NOT seeded here: the live database already has suppliers and
-- the dataset references them directly (see meta.suppliersFromLive).`
    : ""
}

set search_path = public, extensions;

-- Suppliers -----------------------------------------------------------------
`);

if (!SUPPLIERS_FROM_LIVE) {
  parts.push(
    batchInsert(
      "suppliers",
      ["id", "supplier_code", "name", "contact_person", "phone", "email", "website", "status", "payment_terms_days", "notes", "created_at", "updated_at", "created_by"],
      master.suppliers.map((s) => [
        sqlStr(s.id),
        sqlStr(s.supplierCode),
        sqlStr(s.name),
        sqlOrNull(s.contactPerson),
        sqlOrNull(s.phone),
        sqlOrNull(s.email),
        sqlOrNull(s.website),
        sqlStr(s.status),
        sqlNum(s.paymentTermsDays),
        sqlOrNull(s.notes),
        sqlTs(`${s.createdAt}T00:00:00Z`),
        sqlTs(`${s.createdAt}T00:00:00Z`),
        sqlStr(s.createdBy),
      ]),
    ),
  );
}

parts.push(`\n-- Supplier products ------------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "supplier_products",
    ["id", "supplier_id", "variant_id", "supplier_sku", "supplier_product_name", "last_cost", "preferred_supplier", "lead_time_days", "minimum_order_quantity", "is_active", "created_at", "updated_at"],
    master.supplierProducts.map((sp) => [
      sqlStr(sp.id),
      sqlStr(sp.supplierId),
      sqlStr(sp.variantId),
      sqlOrNull(sp.supplierSku),
      sqlStr(sp.supplierProductName),
      sqlNum(sp.lastCost),
      sqlBool(sp.preferredSupplier),
      sqlNum(sp.leadTimeDays),
      sqlNum(sp.minimumOrderQuantity),
      sqlBool(sp.isActive),
      sqlTs(orders.meta.openingDay + "T00:00:00Z"),
      sqlTs(orders.meta.openingDay + "T00:00:00Z"),
    ]),
  ),
);

parts.push(`\n-- Orders --------------------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "orders",
    ["id", "order_number", "customer_id", "channel", "status", "payment_status", "fulfilment_status", "location_id", "guest_name", "guest_phone", "guest_email", "bill_to_recipient", "bill_to_phone", "bill_to_address_line_1", "bill_to_address_line_2", "bill_to_city", "bill_to_region", "delivery_method_name", "delivery_fee", "delivery_recipient", "delivery_phone", "delivery_address_line_1", "delivery_address_line_2", "delivery_city", "delivery_region", "subtotal", "discount_total", "taxable_amount", "tax_amount", "tax_rate", "total_amount", "notes", "created_at", "updated_at"],
    orders.orders.map((o) => [
      sqlStr(o.id),
      sqlStr(o.orderNumber),
      sqlOrNull(o.customerId),
      sqlStr(o.channel),
      sqlStr(o.status),
      sqlStr(o.paymentStatus),
      sqlStr(o.fulfilmentStatus),
      sqlStr(o.locationId),
      sqlOrNull(o.guestName),
      sqlOrNull(o.guestPhone),
      sqlOrNull(o.guestEmail),
      sqlOrNull(o.billToRecipient),
      sqlOrNull(o.billToPhone),
      sqlOrNull(o.billToAddressLine1),
      sqlOrNull(o.billToAddressLine2),
      sqlOrNull(o.billToCity),
      sqlOrNull(o.billToRegion),
      sqlOrNull(o.deliveryMethodName),
      sqlNum(o.deliveryFee),
      sqlOrNull(o.deliveryRecipient),
      sqlOrNull(o.deliveryPhone),
      sqlOrNull(o.deliveryAddressLine1),
      sqlOrNull(o.deliveryAddressLine2),
      sqlOrNull(o.deliveryCity),
      sqlOrNull(o.deliveryRegion),
      sqlNum(o.subtotal),
      sqlNum(o.discountTotal),
      sqlNum(o.taxableAmount),
      sqlNum(o.taxAmount),
      "NULL",
      sqlNum(o.totalAmount),
      sqlOrNull(o.notes),
      sqlTs(o.createdAt),
      sqlTs(o.createdAt),
    ]),
  ),
);

parts.push(`\n-- Order items ---------------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "order_items",
    ["id", "order_id", "variant_id", "quantity", "product_name", "variant_name", "sku", "options", "unit_price", "unit_cost", "discount_amount", "line_total", "taxable_amount", "tax_rate", "tax_amount", "created_at", "updated_at"],
    orderItemRows,
  ),
);

parts.push(`\n-- Payments ------------------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "payments",
    ["id", "order_id", "amount", "method", "status", "payment_date", "reference", "provider", "provider_reference", "notes", "received_by", "created_at", "updated_at"],
    orders.payments.map((p) => [
      sqlStr(p.id),
      sqlStr(p.orderId),
      sqlNum(p.amount),
      sqlStr(p.method),
      sqlStr(p.status),
      sqlTs(p.paymentDate),
      sqlOrNull(p.reference),
      sqlOrNull(p.provider),
      sqlOrNull(p.providerReference),
      sqlOrNull(p.notes),
      sqlStr(p.receivedBy),
      sqlTs(p.createdAt),
      sqlTs(p.createdAt),
    ]),
  ),
);

parts.push(`\n-- Deliveries ----------------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "deliveries",
    ["id", "order_id", "delivery_method_id", "method_name", "status", "carrier", "tracking_reference", "delivered_at", "notes", "created_at", "updated_at"],
    orders.deliveries.map((d) => [
      sqlStr(d.id),
      sqlStr(d.orderId),
      sqlStr(d.deliveryMethodId),
      sqlStr(d.methodName),
      sqlStr(d.status),
      sqlOrNull(d.carrier),
      sqlOrNull(d.trackingReference),
      sqlTs(d.deliveredAt),
      sqlOrNull(d.notes),
      sqlTs(d.createdAt),
      sqlTs(d.createdAt),
    ]),
  ),
);

parts.push(`\n-- Returns -------------------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "returns",
    ["id", "return_number", "order_id", "customer_id", "status", "reason", "reason_note", "created_by", "approved_by", "created_at", "updated_at"],
    orders.returns.map((r) => [
      sqlStr(r.id),
      sqlStr(r.returnNumber),
      sqlStr(r.orderId),
      sqlOrNull(r.customerId),
      sqlStr(r.status),
      sqlStr(r.reason),
      sqlOrNull(r.reasonNote),
      sqlStr(r.createdBy),
      sqlStr(r.approvedBy),
      sqlTs(r.createdAt),
      sqlTs(r.createdAt),
    ]),
  ),
);

parts.push(`\n-- Return items --------------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "return_items",
    ["id", "return_id", "order_item_id", "variant_id", "quantity_returned", "condition", "refund_amount", "created_at", "updated_at"],
    orders.returnItems.map((ri) => {
      const orderItemId = orderItemIdByRef.get(ri.orderItemRef) ?? null;
      if (!orderItemId) throw new Error(`Unresolved return item order reference: ${ri.orderItemRef}`);
      return [
        sqlStr(ri.id),
        sqlStr(ri.returnId),
        sqlStr(orderItemId),
        sqlStr(ri.variantId),
        sqlNum(ri.quantityReturned),
        sqlStr(ri.condition),
        sqlNum(ri.refundAmount),
        sqlTs(ri.createdAt),
        sqlTs(ri.createdAt),
      ];
    }),
  ),
);

parts.push(`\n-- Refunds -------------------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "refunds",
    ["id", "refund_number", "order_id", "payment_id", "return_id", "amount", "method", "status", "reference", "reason", "processed_by", "created_at", "updated_at"],
    orders.refunds.map((r) => [
      sqlStr(r.id),
      sqlStr(r.refundNumber),
      sqlStr(r.orderId),
      sqlOrNull(r.paymentId),
      sqlStr(r.returnId),
      sqlNum(r.amount),
      sqlStr(r.method),
      sqlStr(r.status),
      sqlOrNull(r.reference),
      sqlOrNull(r.reason),
      sqlStr(r.processedBy),
      sqlTs(r.createdAt),
      sqlTs(r.createdAt),
    ]),
  ),
);

parts.push(`\n-- Purchase orders -----------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "purchase_orders",
    ["id", "po_number", "supplier_id", "location_id", "status", "expected_date", "notes", "created_at", "updated_at", "created_by", "approved_by"],
    purchases.purchaseOrders.map((po) => [
      sqlStr(po.id),
      sqlStr(po.poNumber),
      sqlStr(po.supplierId),
      sqlStr(po.locationId),
      sqlStr(po.status),
      sqlStr(po.expectedDate),
      sqlOrNull(po.notes),
      sqlTs(po.createdAt),
      sqlTs(po.updatedAt),
      sqlStr(po.createdBy),
      sqlStr(po.approvedBy),
    ]),
  ),
);

parts.push(`\n-- Purchase order items ------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "purchase_order_items",
    ["id", "purchase_order_id", "variant_id", "quantity_ordered", "unit_cost_expected", "quantity_received", "created_at", "updated_at"],
    purchases.purchaseOrderItems.map((poi) => [
      sqlStr(poi.id),
      sqlStr(poi.purchaseOrderId),
      sqlStr(poi.variantId),
      sqlNum(poi.quantityOrdered),
      sqlNum(poi.unitCostExpected),
      sqlNum(poi.quantityReceived),
      sqlTs(poi.createdAt),
      sqlTs(poi.updatedAt),
    ]),
  ),
);

parts.push(`\n-- Goods receipts -----------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "goods_receipts",
    ["id", "receipt_number", "purchase_order_id", "location_id", "received_date", "status", "notes", "created_at", "updated_at", "created_by"],
    purchases.goodsReceipts.map((gr) => [
      sqlStr(gr.id),
      sqlStr(gr.receiptNumber),
      sqlStr(gr.purchaseOrderId),
      sqlStr(gr.locationId),
      sqlStr(gr.receivedDate),
      sqlStr(gr.status),
      sqlOrNull(gr.notes),
      sqlTs(gr.createdAt),
      sqlTs(gr.updatedAt),
      sqlStr(gr.createdBy),
    ]),
  ),
);

parts.push(`\n-- Goods receipt items ------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "goods_receipt_items",
    ["id", "goods_receipt_id", "purchase_order_item_id", "variant_id", "quantity_received", "unit_cost_actual", "created_at", "updated_at"],
    purchases.goodsReceiptItems.map((gri) => [
      sqlStr(gri.id),
      sqlStr(gri.goodsReceiptId),
      sqlStr(gri.purchaseOrderItemId),
      sqlStr(gri.variantId),
      sqlNum(gri.quantityReceived),
      sqlNum(gri.unitCostActual),
      sqlTs(gri.createdAt),
      sqlTs(gri.updatedAt),
    ]),
  ),
);

parts.push(`\n-- Supplier invoices ---------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "supplier_invoices",
    ["id", "invoice_number", "supplier_id", "purchase_order_id", "invoice_date", "due_date", "amount", "status", "notes", "created_at", "updated_at", "created_by"],
    purchases.supplierInvoices.map((inv) => [
      sqlStr(inv.id),
      sqlStr(inv.invoiceNumber),
      sqlStr(inv.supplierId),
      sqlStr(inv.purchaseOrderId),
      sqlStr(inv.invoiceDate),
      sqlStr(inv.dueDate),
      sqlNum(inv.amount),
      sqlStr(inv.status),
      sqlOrNull(inv.notes),
      sqlTs(inv.createdAt),
      sqlTs(inv.updatedAt),
      sqlStr(inv.createdBy),
    ]),
  ),
);

parts.push(`\n-- Purchase payments ---------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "purchase_payments",
    ["id", "supplier_id", "invoice_id", "purchase_order_id", "amount", "payment_date", "method", "reference", "notes", "created_at", "updated_at", "created_by"],
    purchases.purchasePayments.map((pp) => [
      sqlStr(pp.id),
      sqlStr(pp.supplierId),
      sqlStr(pp.invoiceId),
      sqlStr(pp.purchaseOrderId),
      sqlNum(pp.amount),
      sqlStr(pp.paymentDate),
      sqlStr(pp.method),
      sqlOrNull(pp.reference),
      sqlOrNull(pp.notes),
      sqlTs(pp.createdAt),
      sqlTs(pp.updatedAt),
      sqlStr(pp.createdBy),
    ]),
  ),
);

parts.push(`\n-- Stock movements -----------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "stock_movements",
    ["id", "inventory_item_id", "movement_type", "quantity_change", "unit_cost", "source_type", "source_id", "note", "created_at", "created_by"],
    purchases.stockMovements.map((mv) => [
      sqlStr(mv.id),
      sqlStr(mv.inventoryItemId),
      sqlStr(mv.movementType),
      sqlNum(mv.quantityChange),
      sqlNum(mv.unitCost),
      sqlStr(mv.sourceType),
      sqlStr(mv.sourceId),
      sqlOrNull(mv.note),
      sqlTs(mv.createdAt),
      sqlStr(mv.createdBy),
    ]),
  ),
);

parts.push(`\n-- Expenses ------------------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "expenses",
    ["id", "expense_number", "category_id", "description", "amount", "expense_date", "method", "reference_number", "supplier_id", "location_id", "attachment_url", "notes", "created_at", "updated_at", "created_by"],
    finance.expenses.map((e) => [
      sqlStr(e.id),
      sqlStr(e.expenseNumber),
      sqlStr(e.categoryId),
      sqlStr(e.description),
      sqlNum(e.amount),
      sqlStr(e.expenseDate),
      sqlStr(e.method),
      sqlOrNull(e.referenceNumber),
      sqlOrNull(e.supplierId),
      sqlStr(e.locationId),
      sqlOrNull(e.attachmentUrl),
      sqlOrNull(e.notes),
      sqlTs(e.createdAt),
      sqlTs(e.updatedAt),
      sqlStr(e.createdBy),
    ]),
  ),
);

parts.push(`\n-- Account transactions -------------------------------------------------------\n`);
parts.push(
  batchInsert(
    "account_transactions",
    ["id", "transaction_number", "transaction_type", "bank_account_id", "mobile_money_account_id", "transfer_bank_account_id", "transfer_mobile_money_account_id", "transaction_date", "amount", "reference", "description", "created_by", "created_at"],
    acctRows,
  ),
);

parts.push(`\n-- Document sequences --------------------------------------------------------\n`);
parts.push(seqSql);

if (!existsSync(dirname(outFile))) mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, parts.join("\n"));
const sizeKb = Math.round(readFileSync(outFile, "utf8").length / 1024);
console.log(`Wrote ${outFile} (${sizeKb} KB)`);