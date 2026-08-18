// Historical dataset validator for Yemanuel Store.
//
// Verifies the deterministic dataset produced by
// scripts/generate-historical-transactions.mjs (and consumed by
// scripts/generate-historical-migration.mjs) before it is ever applied:
//
//   - document numbers are unique and within the period (2022-01-01 …
//     2026-08-17)
//   - every order is fully paid by its payments; sales total == payments total
//   - supplier invoices reconcile to purchase payments
//   - the stock journal per variant ends at the preserved
//     inventory_items.quantity_on_hand and never goes negative
//   - bank / mobile-money ledgers never go negative and match opening balance
//     plus flows
//   - every foreign key reference resolves against the live master data
//
// Read-only: this script only queries the live database for master records
// (customers, variants, inventory items, expense categories, delivery methods,
// regions). It never inserts, updates or deletes anything.
//
// Run: node scripts/validate-historical-data.mjs

import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;
const dataDir = `${root}/scripts/historical-data`;

const readJson = (name) => JSON.parse(readFileSync(`${dataDir}/${name}`, "utf8"));
const master = readJson("master.json");
const orders = readJson("orders.json");
const purchases = readJson("purchases.json");
const finance = readJson("finance.json");
const summary = readJson("summary.json");

const PERIOD_START = "2022-01-01";
const PERIOD_END = "2026-08-17";

let failures = 0;
let warnings = 0;
const fail = (msg) => {
  failures += 1;
  console.log(`  FAIL ${msg}`);
};
const warn = (msg) => {
  warnings += 1;
  console.log(`  warn ${msg}`);
};
const pass = (msg) => console.log(`  ok   ${msg}`);

const dateInRange = (date) => date >= PERIOD_START && date <= PERIOD_END;

console.log("Validating historical dataset…");

// ---- 1. document number uniqueness -------------------------------------
const docSets = {
  SO: orders.orders.map((o) => o.orderNumber),
  PO: purchases.purchaseOrders.map((o) => o.poNumber),
  GR: purchases.goodsReceipts.map((o) => o.receiptNumber),
  RET: orders.returns.map((o) => o.returnNumber),
  RFD: orders.refunds.map((o) => o.refundNumber),
  EXP: finance.expenses.map((o) => o.expenseNumber),
  AT: finance.accountTransactions.map((o) => o.transactionCode),
  SUP: master.suppliers.map((o) => o.supplierCode),
};
let dupDocs = 0;
for (const [prefix, nums] of Object.entries(docSets)) {
  const seen = new Set();
  for (const n of nums) {
    if (seen.has(n)) {
      dupDocs += 1;
      fail(`${prefix} duplicate document number ${n}`);
    }
    seen.add(n);
  }
  const outOfRange = nums.filter((n) => {
    const seg = n.split("-")[1];
    const year = /^\d{4}$/.test(seg) ? seg : null;
    return year !== null && (year < "2022" || year > "2026");
  });
  if (outOfRange.length) fail(`${prefix}: ${outOfRange.length} numbers outside 2022-2026 (${outOfRange[0]})`);
}
if (!dupDocs) pass("all document numbers unique and within 2022-2026");

// ---- 2. per-order payment reconciliation -------------------------------
const payByOrder = new Map();
for (const p of orders.payments) {
  const list = payByOrder.get(p.orderId) ?? [];
  list.push(p);
  payByOrder.set(p.orderId, list);
}
let orderMismatch = 0;
let paidOrders = 0;
for (const o of orders.orders) {
  if (o.isCancelled) continue;
  const pays = payByOrder.get(o.id) ?? [];
  const paid = pays.reduce((s, p) => s + p.amount, 0);
  if (Math.abs(paid - o.totalAmount) > 0.005) {
    orderMismatch += 1;
    fail(`${o.orderNumber}: payments ${paid.toFixed(2)} != total ${o.totalAmount.toFixed(2)}`);
  } else {
    paidOrders += 1;
  }
  const withinRange = pays.every((p) => dateInRange(p.dateStr) && p.paymentDate <= `${PERIOD_END}T23:59:59Z`);
  if (!withinRange) fail(`${o.orderNumber}: payment outside period`);
}
if (!orderMismatch) pass(`all ${paidOrders} paid orders reconcile to payments`);

// cancelled orders must have no payments
const cancelledWithPayments = orders.orders.filter((o) => o.isCancelled && (payByOrder.get(o.id)?.length ?? 0) > 0);
if (cancelledWithPayments.length) {
  fail(`${cancelledWithPayments.length} cancelled orders have payments`);
} else {
  pass("cancelled orders carry no payments");
}

const salesTotal = orders.orders.filter((o) => !o.isCancelled).reduce((s, o) => s + o.totalAmount, 0);
const paymentsTotal = orders.payments.reduce((s, p) => s + p.amount, 0);
if (Math.abs(salesTotal - paymentsTotal) > 0.01) {
  fail(`sales total ${salesTotal.toFixed(2)} != payments total ${paymentsTotal.toFixed(2)}`);
} else {
  pass(`sales total == payments total == ${salesTotal.toFixed(2)}`);
}
if (Math.abs(salesTotal - summary.summary.salesTotal) > 0.01) fail("summary.salesTotal mismatch");

// ---- 3. returns / refunds ----------------------------------------------
const returnByOrder = new Map();
for (const r of orders.returns) returnByOrder.set(r.orderId, (returnByOrder.get(r.orderId) ?? 0) + 1);
if (orders.returns.length !== orders.refunds.length) fail("returns count != refunds count");
else pass(`returns == refunds == ${orders.returns.length}`);
for (const rf of orders.refunds) {
  const ret = orders.returns.find((r) => r.id === rf.returnId);
  if (!ret) fail(`refund ${rf.refundNumber} references missing return`);
  if (!dateInRange(rf.dateStr)) fail(`refund ${rf.refundNumber} outside period`);
}
let refundCoverage = 0;
for (const r of orders.returns) {
  const items = orders.returnItems.filter((ri) => ri.returnId === r.id);
  const sum = items.reduce((s, ri) => s + (ri.refundAmount ?? 0), 0);
  const rf = orders.refunds.find((x) => x.returnId === r.id);
  if (rf && Math.abs(rf.amount - sum) > 0.01) {
    refundCoverage += 1;
    fail(`${r.returnNumber}: refund ${rf.amount.toFixed(2)} != return items ${sum.toFixed(2)}`);
  }
}
if (!refundCoverage) pass("refunds reconcile to return item amounts");

// return items resolve to order_items
let badOrderItemRef = 0;
for (const ri of orders.returnItems) {
  const parts = ri.orderItemRef.split(":");
  if (parts.length !== 3) {
    badOrderItemRef += 1;
    fail(`return item ${ri.id} has malformed orderItemRef`);
    continue;
  }
  const order = orders.orders.find((o) => o.id === parts[0]);
  if (!order) {
    badOrderItemRef += 1;
    fail(`return item ${ri.id} references missing order`);
  }
}
if (!badOrderItemRef) pass("return items reference valid order lines");

// ---- 4. purchasing reconciliation --------------------------------------
const invByPo = new Map();
for (const inv of purchases.supplierInvoices) {
  const list = invByPo.get(inv.purchaseOrderId) ?? [];
  list.push(inv);
  invByPo.set(inv.purchaseOrderId, list);
}
const payByInvoice = new Map();
for (const pp of purchases.purchasePayments) {
  const list = payByInvoice.get(pp.invoiceId) ?? [];
  list.push(pp);
  payByInvoice.set(pp.invoiceId, list);
}
let poItemMismatch = 0;
for (const poi of purchases.purchaseOrderItems) {
  const po = purchases.purchaseOrders.find((x) => x.id === poi.purchaseOrderId);
  if (!po) {
    poItemMismatch += 1;
    fail(`PO item references missing PO ${poi.purchaseOrderId}`);
    continue;
  }
  if (!dateInRange(po.dateStr)) fail(`${po.poNumber}: PO outside period`);
  if (poi.quantityReceived !== poi.quantityOrdered) {
    poItemMismatch += 1;
    fail(`${po.poNumber}: received ${poi.quantityReceived} != ordered ${poi.quantityOrdered}`);
  }
}
if (!poItemMismatch) pass("purchase order items fully received");

let invMismatch = 0;
for (const inv of purchases.supplierInvoices) {
  const items = purchases.purchaseOrderItems.filter((i) => i.purchaseOrderId === inv.purchaseOrderId);
  const itemsTotal = items.reduce((s, i) => s + i.unitCostExpected * i.quantityOrdered, 0);
  if (Math.abs(itemsTotal - inv.amount) > 0.01) {
    invMismatch += 1;
    fail(`${inv.invoiceNumber}: amount ${inv.amount.toFixed(2)} != PO items ${itemsTotal.toFixed(2)}`);
  }
  const pays = payByInvoice.get(inv.id) ?? [];
  const paid = pays.reduce((s, p) => s + p.amount, 0);
  if (Math.abs(paid - inv.amount) > 0.01) {
    invMismatch += 1;
    fail(`${inv.invoiceNumber}: paid ${paid.toFixed(2)} != amount ${inv.amount.toFixed(2)}`);
  }
}
if (!invMismatch) pass("invoices reconcile to PO items and purchase payments");

// goods receipt items map to PO items
let grMismatch = 0;
for (const gri of purchases.goodsReceiptItems) {
  if (!purchases.purchaseOrderItems.find((x) => x.id === gri.purchaseOrderItemId)) {
    grMismatch += 1;
    fail(`GR item references missing PO item ${gri.purchaseOrderItemId}`);
  }
}
if (!grMismatch) pass("goods receipt items reference PO items");

// ---- 5. stock journal replay -------------------------------------------
// Replayed against live inventory_items in runLiveChecks() (the generator
// does not persist inventory to JSON; on-hand quantities come from the DB).

// ---- 6. account ledger replay ------------------------------------------
const acct = finance.accountTransactions.slice().sort((a, b) => {
  if (a.dateStr === b.dateStr) return 0;
  return a.dateStr < b.dateStr ? -1 : 1;
});
const bal = {
  bank: summary.summary.bankOpening ?? summary.meta.bankOpening,
  momo: summary.summary.momoOpening ?? summary.meta.momoOpening,
};
let minBal = { bank: 0, momo: 0 };
let acctFail = 0;
for (const t of acct) {
  if (t.transactionType === "deposit") {
    bal[t.toKind] += t.amount;
  } else if (t.transactionType === "withdrawal") {
    bal[t.fromKind] -= t.amount;
  } else if (t.transactionType === "transfer") {
    bal[t.fromKind] -= t.amount;
    bal[t.toKind] += t.amount;
  }
  minBal.bank = Math.min(minBal.bank, bal.bank);
  minBal.momo = Math.min(minBal.momo, bal.momo);
  if (!dateInRange(t.dateStr)) fail(`account transaction ${t.transactionCode} outside period`);
}
if (minBal.bank < -0.0001) acctFail += 1;
if (minBal.momo < -0.0001) acctFail += 1;
if (Math.abs(bal.bank - summary.summary.bankBalance) > 0.01) {
  acctFail += 1;
  fail(`bank ledger ${bal.bank.toFixed(2)} != reported ${summary.summary.bankBalance.toFixed(2)}`);
}
if (Math.abs(bal.momo - summary.summary.momoBalance) > 0.01) {
  acctFail += 1;
  fail(`momo ledger ${bal.momo.toFixed(2)} != reported ${summary.summary.momoBalance.toFixed(2)}`);
}
if (!acctFail) pass(`account ledgers never negative; bank ${bal.bank.toFixed(2)} / momo ${bal.momo.toFixed(2)} match`);

// expected outflows reconcile (purchase payments + expenses + refunds by method)
const expectedOut = { bank: 0, momo: 0 };
const actualOut = { bank: 0, momo: 0 };
const outflow = (method, amount) => {
  if (method === "bank_transfer" || method === "card") expectedOut.bank += amount;
  else if (method === "mobile_money") expectedOut.momo += amount;
};
for (const pp of purchases.purchasePayments) outflow(pp.method, pp.amount);
for (const e of finance.expenses) outflow(e.method, e.amount);
for (const rf of orders.refunds) if (rf.status === "processed") outflow(rf.method, rf.amount);
for (const t of acct) if (t.transactionType === "withdrawal") actualOut[t.fromKind] += t.amount;
if (Math.abs(expectedOut.bank - actualOut.bank) > 0.01 || Math.abs(expectedOut.momo - actualOut.momo) > 0.01) {
  fail(`outflow mismatch: expected bank ${expectedOut.bank.toFixed(2)} / momo ${expectedOut.momo.toFixed(2)}, actual bank ${actualOut.bank.toFixed(2)} / momo ${actualOut.momo.toFixed(2)}`);
} else {
  pass(`account outflows reconcile (bank ${actualOut.bank.toFixed(2)} / momo ${actualOut.momo.toFixed(2)})`);
}

// ---- 7. dates within period --------------------------------------------
let dateFail = 0;
for (const o of orders.orders) if (!dateInRange(o.dateStr)) { dateFail += 1; fail(`${o.orderNumber}: order outside period`); }
for (const p of orders.payments) if (!dateInRange(p.dateStr)) { dateFail += 1; fail(`payment ${p.reference} outside period`); }
for (const r of orders.returns) if (!dateInRange(r.dateStr)) { dateFail += 1; fail(`${r.returnNumber}: outside period`); }
for (const gr of purchases.goodsReceipts) if (!dateInRange(gr.receivedDate)) { dateFail += 1; fail(`${gr.receiptNumber}: outside period`); }
for (const inv of purchases.supplierInvoices) if (!dateInRange(inv.invoiceDate)) { dateFail += 1; fail(`${inv.invoiceNumber}: outside period`); }
for (const pp of purchases.purchasePayments) if (!dateInRange(pp.paymentDate)) { dateFail += 1; fail(`purchase payment outside period`); }
for (const e of finance.expenses) if (!dateInRange(e.expenseDate)) { dateFail += 1; fail(`${e.expenseNumber}: outside period`); }
if (!dateFail) pass("all orders, payments, returns, receipts, invoices, payments and expenses within period");

// ---- 8. counts vs summary ----------------------------------------------
const countChecks = {
  orders: orders.orders.length,
  orderItems: orders.orders.reduce((s, o) => s + o.lines.length, 0),
  payments: orders.payments.length,
  deliveries: orders.deliveries.length,
  returns: orders.returns.length,
  returnItems: orders.returnItems.length,
  refunds: orders.refunds.length,
  purchaseOrders: purchases.purchaseOrders.length,
  purchaseOrderItems: purchases.purchaseOrderItems.length,
  goodsReceipts: purchases.goodsReceipts.length,
  goodsReceiptItems: purchases.goodsReceiptItems.length,
  supplierInvoices: purchases.supplierInvoices.length,
  purchasePayments: purchases.purchasePayments.length,
  expenses: finance.expenses.length,
  stockMovements: purchases.stockMovements.length,
  accountTransactions: finance.accountTransactions.length,
  suppliers: master.suppliers.length,
  supplierProducts: master.supplierProducts.length,
};
let countFail = 0;
for (const [k, v] of Object.entries(countChecks)) {
  if (summary.summary.counts[k] !== v) {
    countFail += 1;
    fail(`summary counts.${k} = ${summary.summary.counts[k]} but file has ${v}`);
  }
}
if (!countFail) pass("record counts match summary.json");

// ---- 9. live master FK checks (read-only) ------------------------------
console.log("\nCross-checking foreign keys against live master data…");
const env = readFileSync(`${root}/.env.local`, "utf8")
  .split("\n")
  .reduce((acc, line) => {
    const eq = line.indexOf("=");
    if (eq > 0) acc[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    return acc;
  }, {});
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

async function fetchIds(path, idCol) {
  const ids = new Set();
  let offset = 0;
  for (;;) {
    const url = `${BASE}/rest/v1/${path}?select=${idCol}&limit=1000&offset=${offset}`;
    const res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!res.ok) throw new Error(`GET ${path} failed (${res.status})`);
    const page = await res.json();
    for (const row of page) ids.add(row[idCol]);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return ids;
}

async function fetchInventory() {
  const map = new Map();
  let offset = 0;
  for (;;) {
    const url = `${BASE}/rest/v1/inventory_items?select=id,quantity_on_hand&limit=1000&offset=${offset}`;
    const res = await fetch(url, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!res.ok) throw new Error(`GET inventory_items failed (${res.status})`);
    const page = await res.json();
    for (const row of page) map.set(row.id, Number(row.quantity_on_hand) || 0);
    if (page.length < 1000) break;
    offset += 1000;
  }
  return map;
}

async function runLiveChecks() {
  if (!BASE || !KEY) {
    warn("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — skipping live FK checks");
    return;
  }
  const [customerIds, variantIds, inventoryIds, catIds, methodIds, regionIds, invOnHand] = await Promise.all([
    fetchIds("customers", "id"),
    fetchIds("product_variants", "id"),
    fetchIds("inventory_items", "id"),
    fetchIds("expense_categories", "id"),
    fetchIds("delivery_methods", "id"),
    fetchIds("regions", "id"),
    fetchInventory(),
  ]);

  // stock journal replay against live on-hand quantities
  const stockByItem = new Map();
  for (const mv of purchases.stockMovements) {
    const list = stockByItem.get(mv.inventoryItemId) ?? [];
    list.push(mv);
    stockByItem.set(mv.inventoryItemId, list);
  }
  let stockFail = 0;
  let stockWarn = 0;
  let variantsChecked = 0;
  for (const [itemId, moves] of stockByItem) {
    if (!inventoryIds.has(itemId)) {
      stockWarn += 1;
      continue;
    }
    variantsChecked += 1;
    const finalOnHand = invOnHand.get(itemId) ?? 0;
    moves.sort((a, b) => (a.createdAt === b.createdAt ? 0 : a.createdAt < b.createdAt ? -1 : 1));
    let balance = 0;
    let minBalance = 0;
    let net = 0;
    for (const mv of moves) {
      balance += Number(mv.quantityChange) || 0;
      minBalance = Math.min(minBalance, balance);
      net += Number(mv.quantityChange) || 0;
    }
    if (minBalance < -0.0001) {
      stockFail += 1;
      fail(`stock item ${itemId} went negative during replay (min ${minBalance})`);
    }
    if (Math.abs(net - finalOnHand) > 0.0001) {
      stockFail += 1;
      fail(`stock item ${itemId}: journal net ${net} != on-hand ${finalOnHand}`);
    }
  }
  if (variantsChecked > 0 && !stockFail) {
    pass(`stock journals reconcile for ${variantsChecked} inventory items (never negative, end == on-hand)`);
  }
  if (stockWarn) warn(`${stockWarn} stock movements reference inventory items not present in live data`);

  let fkFail = 0;
  for (const o of orders.orders) {
    if (o.customerId && !customerIds.has(o.customerId)) { fkFail += 1; fail(`${o.orderNumber}: unknown customer ${o.customerId}`); }
    for (const l of o.lines) {
      if (!variantIds.has(l.variantId)) { fkFail += 1; fail(`${o.orderNumber}: unknown variant ${l.variantId}`); }
    }
  }
  for (const mv of purchases.stockMovements) {
    if (!inventoryIds.has(mv.inventoryItemId)) { fkFail += 1; fail(`stock movement references unknown inventory item ${mv.inventoryItemId}`); }
  }
  for (const e of finance.expenses) {
    if (!catIds.has(e.categoryId)) { fkFail += 1; fail(`${e.expenseNumber}: unknown expense category ${e.categoryId}`); }
  }
  for (const d of orders.deliveries) {
    if (!methodIds.has(d.deliveryMethodId)) { fkFail += 1; fail(`delivery references unknown method ${d.deliveryMethodId}`); }
  }
  for (const s of master.suppliers) {
    if (s.regionCode && !regionIds.has(s.regionCode)) { fkFail += 1; fail(`supplier ${s.supplierCode}: unknown region ${s.regionCode}`); }
  }
  for (const v of master.supplierProducts) {
    if (!variantIds.has(v.variantId)) { fkFail += 1; fail(`supplier product references unknown variant ${v.variantId}`); }
  }
  for (const po of purchases.purchaseOrders) {
    if (!master.suppliers.find((s) => s.id === po.supplierId)) { fkFail += 1; fail(`${po.poNumber}: unknown supplier`); }
  }
  if (!fkFail) {
    pass(`all FK references resolve against live master data (${customerIds.size} customers, ${variantIds.size} variants, ${inventoryIds.size} inventory items)`);
  }
}

// ---------------------------------------------------------------------------
async function main() {
  console.log("\n=== Validation result ===");
  await runLiveChecks();
  console.log(`\nfailures: ${failures} | warnings: ${warnings}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});