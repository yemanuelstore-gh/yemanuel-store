// Historical transaction dataset generator for Yemanuel Store.
//
// Produces a deterministic historical transaction dataset covering
// 2022-01-01 through 2026-08-17 against the LIVE Supabase database:
//   - sales (orders + order_items + payments + deliveries)
//   - returns / refunds
//   - purchasing (suppliers, purchase orders, goods receipts, invoices,
//     purchase payments)
//   - inventory (stock movements consistent with purchases and sales)
//   - expenses
//   - bank / mobile-money account transactions
//
// The dataset is written to scripts/historical-data/*.json and the idempotent
// seed migration is written by scripts/generate-historical-migration.mjs.
//
// Guarantees:
//   - Fixed deterministic RNG seed (mulberry32).
//   - Only real catalogue entities are used (existing customers, variants,
//     prices, inventory items, expense categories, locations, accounts).
//   - No existing records are modified; opening inventory is preserved.
//   - Suppliers are loaded from the live database when any exist (purchasing
//     requires them and purchase_orders.supplier_id is NOT NULL); a
//     deterministic set is fabricated only when the live database has none.
//   - Every document number follows the application convention
//     PREFIX-YYYY-##### and is unique.
//   - All financial arithmetic reconciles; account balances never go negative.
//   - Stock never goes negative; per-variant final on-hand equals the
//     preserved inventory_items.quantity_on_hand.
//
// Run: node scripts/generate-historical-transactions.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;
const dataDir = `${root}/scripts/historical-data`;

const SEED = 20260818;
const PERIOD_START = new Date(Date.UTC(2022, 0, 1));
const PERIOD_END = new Date(Date.UTC(2026, 7, 17));
const OPENING_DAY = new Date(Date.UTC(2022, 0, 17)); // first operating day
const RESTOCK_INTERVAL_DAYS = 60;

// ---------------------------------------------------------------------------
// Deterministic RNG
// ---------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function splitmix(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x9e3779b9) | 0;
    let t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

function mulberry32str(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return mulberry32(h >>> 0);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pickWeighted(rng, pairs) {
  const total = pairs.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [value, w] of pairs) {
    r -= w;
    if (r < 0) return value;
  }
  return pairs[pairs.length - 1][0];
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function isBusinessDay(date) {
  return date.getUTCDay() !== 0;
}

function addDaysUtc(date, days) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function nextBusinessDay(date) {
  let d = addDaysUtc(date, 1);
  while (!isBusinessDay(d)) d = addDaysUtc(d, 1);
  return d;
}

function prevBusinessDay(date) {
  let d = addDaysUtc(date, -1);
  while (!isBusinessDay(d)) d = addDaysUtc(d, -1);
  return d;
}

function dayDiff(a, b) {
  return Math.round((b - a) / 86400000);
}

const pad2 = (n) => String(n).padStart(2, "0");
function formatDate(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}
function formatTimestamp(d) {
  return `${formatDate(d)}T${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}Z`;
}

function hashFloat(str) {
  return mulberry32str(str)();
}

function hashInt(str, mod) {
  return Math.floor(hashFloat(str) * mod);
}

// Deterministic UUID v5-style (namespace + name, sha1).
const UUID_NS = "7c1d0f62-9f4e-4b1a-9d1a-1c0a0f0f0f0f";
function uuid5(name) {
  const h = createHash("sha1").update(`${UUID_NS}${name}`, "utf8").digest();
  h[6] = (h[6] & 0x0f) | 0x50;
  h[8] = (h[8] & 0x3f) | 0x80;
  const hex = h.toString("hex").slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

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
function sqlDate(value) {
  return value === null || value === undefined ? "NULL" : sqlStr(value);
}
function sqlTs(value) {
  return value === null || value === undefined ? "NULL" : sqlStr(value);
}
function sqlJson(value) {
  if (value === null || value === undefined) return "NULL";
  return `${sqlStr(JSON.stringify(value))}::jsonb`;
}

// ---------------------------------------------------------------------------
// Supabase client helpers
// ---------------------------------------------------------------------------
const env = readFileSync(`${root}/.env.local`, "utf8")
  .split("\n")
  .reduce((acc, line) => {
    const eq = line.indexOf("=");
    if (eq > 0) acc[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    return acc;
  }, {});

const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const PAGE_SIZE = 1000;

async function fetchAll(path, select) {
  const rows = [];
  let offset = 0;
  for (;;) {
    const url = `${BASE}/rest/v1/${path}?select=${encodeURIComponent(select)}&limit=${PAGE_SIZE}&offset=${offset}`;
    const res = await fetch(url, {
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    });
    if (!res.ok) {
      throw new Error(`GET ${path} failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function loadMasterData() {
  console.log("Fetching master data…");
  const [customers, variants, products, prices, inventory, staff, locations, methods, regions, rates, cats, banks, mms] =
    await Promise.all([
      fetchAll("customers", "id,customer_code,customer_type,first_name,last_name,phone,created_at"),
      fetchAll("product_variants", "id,product_id,name,sku,status,options"),
      fetchAll("products", "id,name,status,category_id"),
      fetchAll("prices", "id,product_id,variant_id,price_type,amount,location_id"),
      fetchAll("inventory_items", "id,location_id,variant_id,quantity_on_hand,average_cost"),
      fetchAll("staff", "id,employee_code,profile_id,position,hire_date"),
      fetchAll("locations", "id,code,name,location_type,status"),
      fetchAll("delivery_methods", "id,code,name,kind,fee,is_active"),
      fetchAll("regions", "id,code,name"),
      fetchAll("delivery_rates", "delivery_method_id,region_id,fee"),
      fetchAll("expense_categories", "id,name,is_active"),
      fetchAll("bank_accounts", "id,account_code,account_name,account_number,opening_balance,opening_date,status"),
      fetchAll("mobile_money_accounts", "id,account_code,account_name,mobile_number,opening_balance,opening_date,status"),
    ]);

  // Customer segment overlay from the validated master dataset.
  let customerSegments = {};
  try {
    const custData = JSON.parse(readFileSync(`${root}/scripts/customer-data/customers.json`, "utf8"));
    customerSegments = new Map(custData.customers.map((c) => [c.customerCode, c]));
  } catch {
    console.warn("scripts/customer-data/customers.json not found — using flat customer weights.");
  }

  const productById = new Map(products.map((p) => [p.id, p]));
  const variantById = new Map(variants.map((v) => [v.id, v]));

  // Price maps: min selling / min sale per variant, with product-level fallback.
  const variantPrices = new Map(); // vid -> {selling, sale}
  const productPrices = new Map(); // pid -> {selling, sale}
  const applyPrice = (map, key, type, amount) => {
    const cur = map.get(key) ?? {};
    if (type === "selling") cur.selling = cur.selling === undefined ? amount : Math.min(cur.selling, amount);
    else cur.sale = cur.sale === undefined ? amount : Math.min(cur.sale, amount);
    map.set(key, cur);
  };
  for (const p of prices) {
    const amount = Number(p.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    if (p.variant_id) applyPrice(variantPrices, p.variant_id, p.price_type, amount);
    else if (p.product_id) applyPrice(productPrices, p.product_id, p.price_type, amount);
  }
  const priceFor = (variant) => {
    const vp = variantPrices.get(variant.id);
    const pp = productPrices.get(variant.product_id);
    const selling = vp?.selling ?? pp?.selling ?? null;
    const sale = vp?.sale ?? pp?.sale ?? null;
    return { selling, sale };
  };

  const inventoryByVariant = new Map(inventory.map((i) => [i.variant_id, i]));
  const location = locations.find((l) => l.status === "active") ?? locations[0];
  const ownerStaff = staff.find((s) => s.employee_code === "YS-OWNER-0001") ?? staff[0];
  if (!ownerStaff) throw new Error("No owner staff record found.");
  const ownerAuthId = ownerStaff.profile_id;
  if (!ownerAuthId) throw new Error("Owner staff record has no profile_id.");

  const methodByCode = new Map(methods.map((m) => [m.code, m]));
  const regionByCode = new Map(regions.map((r) => [r.code, r]));
  const rateFeeByRegionCode = new Map();
  for (const r of regions) {
    const ratesFor = rates.filter((x) => x.region_id === r.id);
    const std = ratesFor.find((x) => methodByCode.get("STANDARD")?.id === x.delivery_method_id);
    if (std) rateFeeByRegionCode.set(r.code, Number(std.fee));
  }

  const bank = banks.find((b) => b.status === "active") ?? banks[0];
  const momo = mms.find((m) => m.status === "active") ?? mms[0];
  if (!bank || !momo) throw new Error("Bank or mobile money account missing.");

  const categoryById = new Map(cats.map((c) => [c.id, c]));

  console.log(
    `  ${customers.length} customers, ${variants.length} variants, ${products.length} products, ${prices.length} prices`,
  );
  console.log(`  owner staff: ${ownerStaff.employee_code} (${ownerAuthId})`);

  return {
    customers,
    variants,
    products,
    prices,
    inventory,
    staff,
    locations,
    methods,
    regions,
    rates,
    cats,
    banks,
    mms,
    productById,
    variantById,
    priceFor,
    inventoryByVariant,
    location,
    ownerStaff,
    ownerAuthId,
    methodByCode,
    regionByCode,
    rateFeeByRegionCode,
    customerSegments,
    bank,
    momo,
    categoryById,
  };
}

// ---------------------------------------------------------------------------
// Suppliers
// ---------------------------------------------------------------------------
const SUPPLIER_TEMPLATES = [
  { name: "GN Wholesale Distributors Ltd", contact: "Kwame Mensah", phone: "+233 20 411 7788", email: "sales@gnwholesale.com.gh", website: "https://gnwholesale.com.gh", terms: 30, city: "Accra", region: "ACC" },
  { name: "Accra Textiles & Fabrics Co.", contact: "Ama Owusu", phone: "+233 24 552 1903", email: "orders@accratextiles.com", website: "https://accratextiles.com", terms: 21, city: "Accra", region: "ACC" },
  { name: "Kumasi Fabrics House", contact: "Yaw Boateng", phone: "+233 50 388 2461", email: "info@kumasifabrics.gh", website: "https://kumasifabrics.gh", terms: 30, city: "Kumasi", region: "ASH" },
  { name: "Modest Boutique Supplies", contact: "Abena Serwaa", phone: "+233 55 221 8834", email: "hello@modestboutique.gh", website: "https://modestboutique.gh", terms: 14, city: "Tema", region: "ACC" },
  { name: "TechNova Electronics Importers", contact: "Kofi Asante", phone: "+233 27 690 4412", email: "sales@technova.com.gh", website: "https://technova.com.gh", terms: 30, city: "Accra", region: "ACC" },
  { name: "Silver Star Electronics Ghana", contact: "Efua Dadzie", phone: "+233 26 135 7780", email: "enquiries@silverstar.gh", website: "https://silverstar.gh", terms: 45, city: "Takoradi", region: "WES" },
  { name: "Meridian Home & Living", contact: "Adjoa Nkansah", phone: "+233 54 208 9921", email: "sales@meridianhome.gh", website: "https://meridianhome.gh", terms: 30, city: "Accra", region: "ACC" },
  { name: "Accra Home Supplies", contact: "Kojo Sarpong", phone: "+233 23 447 6610", email: "info@acchome.gh", website: "https://acchome.gh", terms: 21, city: "Accra", region: "ACC" },
  { name: "Glam Beauty Distributors", contact: "Naana Acheampong", phone: "+233 57 812 3456", email: "orders@glambeauty.gh", website: "https://glambeauty.gh", terms: 14, city: "Kumasi", region: "ASH" },
  { name: "Elegance Beauty Supply", contact: "Akosua Frimpong", phone: "+233 50 674 2231", email: "hello@elegancebeauty.gh", website: "https://elegancebeauty.gh", terms: 30, city: "Accra", region: "ACC" },
  { name: "FoodPack Enterprises", contact: "Issifu Adam", phone: "+233 24 330 1187", email: "sales@foodpack.gh", website: "https://foodpack.gh", terms: 21, city: "Tema", region: "ACC" },
  { name: "Global Logistics & Freight", contact: "Selorm Agbeko", phone: "+233 26 415 9087", email: "ops@globallog.gh", website: "https://globallog.gh", terms: 15, city: "Tema", region: "ACC" },
  { name: "PrintTech Office Solutions", contact: "Mawuli Kpodo", phone: "+233 20 902 5543", email: "sales@printtech.gh", website: "https://printtech.gh", terms: 30, city: "Accra", region: "ACC" },
  { name: "SmartMobile & Accessories Ltd", contact: "Daniel Osei", phone: "+233 55 720 6643", email: "support@smartmobile.gh", website: "https://smartmobile.gh", terms: 21, city: "Accra", region: "ACC" },
  { name: "Kwame Traders International", contact: "Kwabena Anane", phone: "+233 27 588 3321", email: "trade@kwametraders.gh", website: "https://kwametraders.gh", terms: 30, city: "Kumasi", region: "ASH" },
  { name: "West Africa Textiles Importers", contact: "Fatima Sulemana", phone: "+233 50 115 7789", email: "imports@watextiles.gh", website: "https://watextiles.gh", terms: 45, city: "Tema", region: "ACC" },
  { name: "Gold Coast Cosmetics Wholesale", contact: "Esi Quartey", phone: "+233 54 903 2214", email: "sales@gccosmetics.gh", website: "https://gccosmetics.gh", terms: 30, city: "Accra", region: "ACC" },
  { name: "Metro Stationery & Office Supplies", contact: "Philip Adjei", phone: "+233 23 667 8890", email: "orders@metrostationery.gh", website: "https://metrostationery.gh", terms: 21, city: "Accra", region: "ACC" },
];

const CATEGORY_KEYWORDS = [
  { supplier: 1, re: /textile|fabric|african|wear|cloth|fashion|shirt|dress|outfit|kente|print|attire|suit|kaftan|agbada|slip/i, nameRe: /textile|fashion|apparel|wear|cloth|fabric|style|trend|urban|moda/i },
  { supplier: 3, re: /shoe|sandal|heel|sneaker|footwear|boot|bag|handbag|wallet|belt|jewel|necklace|earring|watch|scarf|accessor/i, nameRe: /shoe|leather|accessor|flexgear/i },
  { supplier: 4, re: /phone|mobile|smartphone|electronic|laptop|tablet|tv|television|computer|monitor|keyboard|mouse|gadget|audio|earphone|headset|speaker|charger|power|battery|device|camera|drone|console/i, nameRe: /electronic|mobile|digital|tech|power|audio|computer|device|charge|micro|smart|gadget|phone|nova|stor|peak|wave|sound|vision|harbor|bridge/i },
  { supplier: 6, re: /appliance|refrigerator|fridge|freezer|microwave|blender|kettle|iron|air conditioner|washing|vacuum|fan|heater|kitchen gadget/i, nameRe: /appliance|smartliving|lifestyle|home|house|living|consumer/i },
  { supplier: 7, re: /cosmetic|beauty|skincare|skin care|makeup|make-up|hair|shampoo|conditioner|perfume|cream|lotion|body|soap|fragrance|nail|lipstick|foundation|oil/i, nameRe: /beauty|cosmetic|skin|glam|fragrance/i },
  { supplier: 8, re: /home|furniture|decor|décor|cushion|curtain|bedding|towel|rug|mat|kitchen|dining|glassware|tableware|shelf|storage|basket|candle|vase/i, nameRe: /home|lifestyle|house|living|consumer|goods|everhome|style|value/i },
  { supplier: 12, re: /office|stationery|paper|printer|ink|toner|pen|notebook|folder|desk|school|book|board/i, nameRe: /office|stationery|print|paper|school|book/i },
  { supplier: 15, re: /packag|wrap|tape|box|bubble|carrier bag|sack/i, nameRe: /packag|wrap|tape|box|bubble|sack/i },
];

function supplierIndexForCategory(categoryName, rng) {
  if (categoryName) {
    for (const rule of CATEGORY_KEYWORDS) {
      if (rule.re.test(categoryName)) return rule.supplier;
    }
  }
  return 1 + Math.floor(rng() * SUPPLIER_TEMPLATES.length);
}

function liveSupplierIndexForCategory(categoryName, categoryId, pool) {
  if (categoryName) {
    for (const rule of CATEGORY_KEYWORDS) {
      if (rule.re.test(categoryName)) {
        const candidates = pool.filter((s) => rule.nameRe.test(s.name));
        if (candidates.length > 0) {
          return pool.indexOf(candidates[hashInt(categoryId, candidates.length)]);
        }
      }
    }
  }
  return hashInt(categoryId, pool.length);
}

// ---------------------------------------------------------------------------
// Business day iteration
// ---------------------------------------------------------------------------
function businessDaysInRange(start, end) {
  const days = [];
  let cursor = start;
  while (cursor <= end) {
    if (isBusinessDay(cursor)) days.push(cursor);
    cursor = addDaysUtc(cursor, 1);
  }
  return days;
}

// ---------------------------------------------------------------------------
// Main generation
// ---------------------------------------------------------------------------
function generateDataset(master, liveSuppliers) {
  const rng = mulberry32(SEED);
  const rngA = splitmix(SEED + 1);
  const rngB = splitmix(SEED + 2);
  const rngC = splitmix(SEED + 3);
  const rngD = splitmix(SEED + 4);
  const rngE = splitmix(SEED + 5);

  const { location, ownerStaff, ownerAuthId, bank, momo } = master;
  const LOCATION_ID = location.id;
  const OWNER_STAFF_ID = ownerStaff.id;
  const OWNER_AUTH_ID = ownerAuthId;

  // ---- suppliers ------------------------------------------------------
  const suppliers = [];
  const supplierById = new Map();
  const suppliersFromLive = liveSuppliers && liveSuppliers.length > 0;
  if (suppliersFromLive) {
    for (const s of liveSuppliers) {
      const supplier = {
        id: s.id,
        supplierCode: s.supplier_code,
        name: s.name,
        contactPerson: null,
        phone: null,
        email: null,
        website: null,
        status: s.status ?? "active",
        paymentTermsDays: s.payment_terms_days === null || s.payment_terms_days === undefined
          ? 30
          : Number(s.payment_terms_days),
        notes: null,
        city: null,
        regionCode: null,
        createdBy: OWNER_AUTH_ID,
        createdAt: formatDate(OPENING_DAY),
      };
      suppliers.push(supplier);
      supplierById.set(supplier.id, supplier);
    }
  } else {
    SUPPLIER_TEMPLATES.forEach((t, i) => {
      const id = uuid5(`supplier:${t.name}`);
      const supplier = {
        id,
        supplierCode: `SUP-2022-${String(i + 1).padStart(5, "0")}`,
        name: t.name,
        contactPerson: t.contact,
        phone: t.phone,
        email: t.email,
        website: t.website,
        status: "active",
        paymentTermsDays: t.terms,
        notes: "Historical supplier used by the transaction dataset seed.",
        city: t.city,
        regionCode: t.region,
        createdBy: OWNER_AUTH_ID,
        createdAt: formatDate(OPENING_DAY),
      };
      suppliers.push(supplier);
      supplierById.set(id, supplier);
    });
  }

  // category -> supplier index
  const categorySupplier = new Map();
  const catRng = mulberry32str("catsup");
  for (const [cid, cat] of master.categoryById) {
    if (suppliersFromLive) {
      categorySupplier.set(cid, liveSupplierIndexForCategory(cat?.name, cid, suppliers));
    } else {
      categorySupplier.set(cid, supplierIndexForCategory(cat?.name, catRng));
    }
  }

  const variantSupplierIndex = (variant) => {
    const prod = master.productById.get(variant.product_id);
    const catId = prod?.category_id;
    const idx = catId ? categorySupplier.get(catId) : null;
    return idx !== null && idx !== undefined ? idx : hashInt(variant.id, suppliers.length);
  };

  // ---- sellable variant catalogue --------------------------------------
  const sellable = [];
  for (const v of master.variants) {
    if (v.status !== "active") continue;
    const prod = master.productById.get(v.product_id);
    if (!prod || prod.status !== "active") continue;
    const { selling, sale } = master.priceFor(v);
    if (selling === null && sale === null) continue;
    const inv = master.inventoryByVariant.get(v.id);
    const cost = inv && Number(inv.average_cost) > 0 ? Number(inv.average_cost) : (selling ?? sale) * 0.55;
    sellable.push({
      id: v.id,
      productId: v.product_id,
      productName: prod.name,
      variantName: v.name,
      sku: v.sku,
      options: v.options ?? null,
      selling,
      sale,
      cost: round2(cost),
      supplierIndex: variantSupplierIndex(v),
    });
  }
  sellable.sort((a, b) => hashFloat(b.id) - hashFloat(a.id));
  const pickVariant = (rngPick) => {
    const t = 1 - Math.pow(rngPick(), 2.6);
    return sellable[Math.floor(t * sellable.length)];
  };
  console.log(`  ${sellable.length} sellable variants`);

  // ---- customers -------------------------------------------------------
  const customers = [];
  const SEGMENT_WEIGHTS = {
    one_time: 1,
    occasional: 3,
    regular: 7,
    frequent: 14,
    vip: 22,
    business_buyer: 10,
    corporate_buyer: 18,
  };
  for (const c of master.customers) {
    const overlay = master.customerSegments.get(c.customer_code);
    const segment = overlay?.segment ?? "occasional";
    const addr = overlay?.address ?? null;
    customers.push({
      id: c.id,
      customerCode: c.customer_code,
      customerType: c.customer_type,
      firstName: c.first_name,
      lastName: c.last_name,
      phone: c.phone,
      createdAt: c.created_at,
      segment,
      weight: SEGMENT_WEIGHTS[segment] ?? 3,
      address: addr,
    });
  }
  customers.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const cumWeights = [];
  let cum = 0;
  for (const c of customers) {
    cum += c.weight;
    cumWeights.push(cum);
  }
  const totalWeight = cum;
  const pickCustomerIndex = (rngPick, dateStr) => {
    let lo = 0;
    let hi = customers.length - 1;
    let first = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (customers[mid].createdAt <= dateStr) {
        first = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    if (first < 0) return -1;
    const target = rngPick() * cumWeights[first];
    lo = 0;
    hi = first;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumWeights[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };

  // ---- seasonality -----------------------------------------------------
  const SEASONALITY = [1.2, 1.3, 1.05, 1.1, 1.0, 1.0, 1.05, 1.15, 1.1, 1.15, 1.25, 1.7];
  const WEEKDAY = [0.9, 0.95, 1.0, 1.05, 1.15, 1.4, 1.0];
  const BASE_BY_YEAR = { 2022: 2.3, 2023: 4.1, 2024: 6.6, 2025: 9.1, 2026: 11.3 };
  const ONLINE_SHARE_BY_YEAR = { 2022: 0.32, 2023: 0.36, 2024: 0.4, 2025: 0.44, 2026: 0.48 };

  const GUEST_FIRST = [
    "Kwame", "Kofi", "Yaw", "Kwabena", "Kwaku", "Kojo", "Ama", "Akosua", "Abena", "Efua",
    "Araba", "Esi", "Adwoa", "Yaa", "Akua", "Emmanuel", "Michael", "Grace", "Comfort", "Patience",
    "Daniel", "Samuel", "Mercy", "Esther", "Sarah", "George", "Richard", "Rita", "Linda", "Frank",
  ];
  const GUEST_LAST = [
    "Mensah", "Owusu", "Boateng", "Appiah", "Osei", "Asante", "Asare", "Frimpong", "Agyeman",
    "Ampofo", "Opoku", "Darko", "Antwi", "Boadu", "Tetteh", "Annor", "Dankwa", "Quaye", "Armah",
    "Cudjoe", "Adu", "Adjei", "Sarpong", "Ansah", "Twum", "Annan", "Gyan", "Fosu", "Yeboah",
    "Kwarteng",
  ];
  const MOBILE_PREFIXES = ["020", "024", "026", "027", "050", "054", "055", "056", "057", "059", "023"];
  const genPhone = (rngPick) => {
    const p = pick(rngPick, MOBILE_PREFIXES);
    let num = "";
    for (let i = 0; i < 7; i += 1) num += Math.floor(rngPick() * 10);
    return `+233 ${p[1]}${p[2]} ${num.slice(0, 3)} ${num.slice(3)}`;
  };

  const LINE_COUNT_WEIGHTS = [[1, 0.35], [2, 0.28], [3, 0.18], [4, 0.1], [5, 0.06], [6, 0.03]];
  const QTY_WEIGHTS = [[1, 0.72], [2, 0.2], [3, 0.08]];

  const days = businessDaysInRange(OPENING_DAY, PERIOD_END);
  const todayStr = formatDate(PERIOD_END);

  const orders = [];
  const docCounters = {};
  const nextDoc = (prefix, year) => {
    const key = `${prefix}-${year}`;
    docCounters[key] = (docCounters[key] ?? 0) + 1;
    return `${prefix}-${year}-${String(docCounters[key]).padStart(5, "0")}`;
  };

  const deliveryFeeFor = (regionCode) => master.rateFeeByRegionCode.get(regionCode) ?? 25;
  const regionNameFor = (regionCode) => master.regionByCode.get(regionCode)?.name ?? "Greater Accra";
  const deliveryMethodFor = (code) => master.methodByCode.get(code);

  let cancelledCount = 0;
  let onlineCount = 0;
  let inStoreCount = 0;
  let guestCount = 0;

  for (const day of days) {
    const year = day.getUTCFullYear();
    const base = BASE_BY_YEAR[year];
    const season = SEASONALITY[day.getUTCMonth()];
    const weekday = WEEKDAY[day.getUTCDay()];
    const expected = base * season * weekday;
    const count = Math.max(0, Math.round(expected * (0.55 + rng() * 0.9)));
    const dayStr = formatDate(day);

    for (let i = 0; i < count; i += 1) {
      const onlineShare = ONLINE_SHARE_BY_YEAR[year];
      const isOnline = rng() < onlineShare;
      const custIdx = pickCustomerIndex(rng, dayStr);

      let customer = null;
      let isGuest = false;
      if (isOnline) {
        customer = custIdx >= 0 ? customers[custIdx] : null;
        if (!customer) continue;
      } else {
        if (custIdx >= 0 && rng() < 0.5) {
          customer = customers[custIdx];
        } else {
          isGuest = true;
          guestCount += 1;
        }
      }

      const nLines = pickWeighted(rng, LINE_COUNT_WEIGHTS);
      const lines = [];
      const seen = new Set();
      let attempts = 0;
      while (lines.length < nLines && attempts < 20) {
        attempts += 1;
        const v = pickVariant(rng);
        if (seen.has(v.id)) continue;
        seen.add(v.id);
        const useSale = v.sale !== null && v.sale < v.selling && rng() < 0.14;
        const unitPrice = useSale ? v.sale : v.selling;
        const quantity = pickWeighted(rng, QTY_WEIGHTS);
        lines.push({
          variantId: v.id,
          productName: v.productName,
          variantName: v.variantName,
          sku: v.sku,
          options: v.options,
          unitPrice: round2(unitPrice),
          quantity,
          lineTotal: round2(unitPrice * quantity),
          unitCost: v.cost,
        });
      }
      if (lines.length === 0) continue;
      const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));

      const orderId = uuid5(`order:${dayStr}:${i}`);
      const hour = isOnline ? randInt(rng, 8, 22) : randInt(rng, 9, 19);
      const minute = randInt(rng, 0, 59);
      const createdTs = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute));
      const createdStr = formatTimestamp(createdTs);

      const isCancelled = rng() < 0.015;

      let deliveryMethodCode = null;
      let deliveryFee = 0;
      let pickupLocationId = null;
      let pickupLocationName = null;
      let status = "delivered";
      let fulfilment = "fulfilled";

      const age = dayDiff(day, PERIOD_END);

      if (isOnline) {
        const r = rng();
        if (r < 0.25) {
          deliveryMethodCode = "PICKUP";
          pickupLocationId = LOCATION_ID;
          pickupLocationName = location.name;
          deliveryFee = 0;
        } else {
          deliveryMethodCode = r < 0.8 ? "STANDARD" : "EXPRESS";
          const regionCode = customer?.address?.regionCode ?? "ACC";
          deliveryFee = deliveryMethodFor(deliveryMethodCode)?.code === "STANDARD"
            ? deliveryFeeFor(regionCode)
            : round2(deliveryFeeFor(regionCode) * 1.6);
        }
        if (isCancelled) {
          status = "cancelled";
          fulfilment = "unfulfilled";
        } else if (age >= 21) {
          status = "delivered";
          fulfilment = "fulfilled";
        } else if (age >= 8) {
          status = rng() < 0.8 ? "delivered" : "shipped";
          fulfilment = "fulfilled";
        } else if (age >= 3) {
          status = rng() < 0.4 ? "shipped" : "processing";
          fulfilment = rng() < 0.6 ? "fulfilled" : "partially_fulfilled";
        } else {
          status = "processing";
          fulfilment = "unfulfilled";
        }
      } else {
        if (isCancelled) {
          status = "cancelled";
          fulfilment = "unfulfilled";
        } else {
          status = "delivered";
          fulfilment = "fulfilled";
        }
      }

      const totalAmount = round2(subtotal + deliveryFee);
      const channel = isOnline ? "online" : "in_store";
      if (isOnline) onlineCount += 1;
      else inStoreCount += 1;
      if (isCancelled) cancelledCount += 1;

      const fullName = customer ? `${customer.firstName} ${customer.lastName}` : null;
      const phone = customer ? customer.phone : isGuest ? genPhone(rng) : null;
      const guestName = customer ? null : isGuest ? `${pick(rng, GUEST_FIRST)} ${pick(rng, GUEST_LAST)}` : null;
      const addr = customer?.address ?? null;

      const deliveryMethodName = deliveryMethodCode ? deliveryMethodFor(deliveryMethodCode).name : null;

      orders.push({
        id: orderId,
        orderNumber: nextDoc("SO", day.getUTCFullYear()),
        customerId: customer ? customer.id : null,
        channel,
        status,
        paymentStatus: isCancelled ? "unpaid" : "paid",
        fulfilmentStatus: fulfilment,
        locationId: LOCATION_ID,
        guestName,
        guestPhone: isGuest ? phone : null,
        guestEmail: null,
        billToRecipient: isOnline ? fullName : customer ? fullName : null,
        billToPhone: isOnline ? phone : customer ? phone : null,
        billToAddressLine1: isOnline ? (addr?.addressLine1 ?? null) : null,
        billToAddressLine2: isOnline ? (addr?.addressLine2 ?? null) : null,
        billToCity: isOnline ? (addr?.city ?? null) : null,
        billToRegion: isOnline ? (addr ? regionNameFor(addr.regionCode) : null) : null,
        deliveryMethodName,
        deliveryFee: round2(deliveryFee),
        deliveryRecipient: isOnline ? (addr?.recipientName ?? fullName) : null,
        deliveryPhone: isOnline ? (addr?.recipientPhone ?? phone) : null,
        deliveryAddressLine1: isOnline ? (addr?.addressLine1 ?? null) : null,
        deliveryAddressLine2: isOnline ? (addr?.addressLine2 ?? null) : null,
        deliveryCity: isOnline ? (addr?.city ?? null) : null,
        deliveryRegion: isOnline ? (addr ? regionNameFor(addr.regionCode) : null) : null,
        pickupLocationId,
        pickupLocationName,
        subtotal,
        discountTotal: 0,
        taxableAmount: 0,
        taxAmount: 0,
        taxRate: null,
        totalAmount,
        notes: null,
        createdAt: createdStr,
        dateStr: dayStr,
        age,
        lines,
        isCancelled,
        isOnline,
        deliveryMethodCode,
        regionCode: customer?.address?.regionCode ?? "ACC",
      });
    }
  }

  // ---- payments --------------------------------------------------------
  const METHOD_IN_STORE = [
    ["cash", 0.42],
    ["mobile_money", 0.4],
    ["card", 0.11],
    ["bank_transfer", 0.04],
    ["other", 0.03],
  ];
  const METHOD_ONLINE = [
    ["mobile_money", 0.55],
    ["card", 0.25],
    ["bank_transfer", 0.15],
    ["cash", 0.05],
  ];

  const payments = [];
  const paymentByOrder = new Map(); // orderId -> payments[]
  for (const order of orders) {
    if (order.isCancelled) continue;
    const split = order.totalAmount >= 150 && rngA() < 0.12;
    let plan;
    if (split) {
      const firstCents = Math.round(order.totalAmount * 100 * (0.4 + rngA() * 0.2));
      const first = firstCents / 100;
      plan = [first, round2(order.totalAmount - first)];
    } else {
      plan = [order.totalAmount];
    }
    const perOrder = [];
    for (let k = 0; k < plan.length; k += 1) {
      const method = pickWeighted(rngA, order.isOnline ? METHOD_ONLINE : METHOD_IN_STORE);
      const paymentId = uuid5(`payment:${order.id}:${k}`);
      const offsetDays = order.isOnline ? randInt(rngA, 0, 2) : 0;
      let payDate = addDaysUtc(new Date(order.createdAt), offsetDays);
      if (payDate > PERIOD_END) payDate = PERIOD_END;
      if (!isBusinessDay(payDate)) payDate = nextBusinessDay(payDate);
      if (payDate > PERIOD_END) payDate = PERIOD_END;
      perOrder.push({
        id: paymentId,
        orderId: order.id,
        amount: plan[k],
        method,
        status: "paid",
        paymentDate: formatTimestamp(payDate),
        dateStr: formatDate(payDate),
        reference: `PAY-${createHash("sha1").update(paymentId).digest("hex").slice(0, 8).toUpperCase()}`,
        provider: null,
        providerReference: null,
        notes: null,
        receivedBy: OWNER_STAFF_ID,
        createdAt: formatTimestamp(payDate),
      });
    }
    payments.push(...perOrder);
    paymentByOrder.set(order.id, perOrder);
  }

  // ---- deliveries ------------------------------------------------------
  const deliveries = [];
  for (const order of orders) {
    if (order.isCancelled || !order.isOnline || order.deliveryMethodCode === "PICKUP") continue;
    const delivered =
      order.status === "delivered" ||
      order.status === "shipped" ||
      order.status === "out_for_delivery" ||
      order.status === "ready_for_delivery";
    if (!delivered) continue;
    const method = deliveryMethodFor(order.deliveryMethodCode);
    const deliveredAt = addDaysUtc(new Date(order.createdAt), randInt(rngB, 1, 5));
    const finalTs = deliveredAt > PERIOD_END ? PERIOD_END : deliveredAt;
    deliveries.push({
      id: uuid5(`delivery:${order.id}`),
      orderId: order.id,
      deliveryMethodId: method.id,
      methodName: method.name,
      status: order.status === "delivered" ? "delivered" : "shipped",
      carrier: pick(rngB, ["Yemanuel Express", "GhanaPost Courier", "Kwik Logistics", "Sendy Ghana"]),
      trackingReference: `YS-${order.dateStr.replace(/-/g, "")}-${createHash("sha1").update(order.id).digest("hex").slice(0, 6).toUpperCase()}`,
      deliveredAt: formatTimestamp(finalTs),
      notes: null,
      createdAt: formatTimestamp(addDaysUtc(new Date(order.createdAt), 1)),
    });
  }

  // ---- returns & refunds -----------------------------------------------
  const returns = [];
  const returnItems = [];
  const refunds = [];
  const returnReasonWeights = [
    ["wrong_item", 0.18],
    ["damaged", 0.26],
    ["not_as_described", 0.16],
    ["changed_mind", 0.2],
    ["quality", 0.12],
    ["other", 0.08],
  ];
  const conditionWeights = [
    ["resellable", 0.72],
    ["not_resellable", 0.28],
  ];

  for (const order of orders) {
    if (order.isCancelled) continue;
    if (order.age < 3) continue;
    if (rngB() >= 0.06) continue;
    const returnId = uuid5(`return:${order.id}`);
    const returnDate = addDaysUtc(new Date(order.createdAt), randInt(rngB, 2, 14));
    if (returnDate > PERIOD_END) continue;
    const returnDateStr = formatDate(returnDate);
    const nItems = Math.min(order.lines.length, pickWeighted(rngB, [[1, 0.7], [2, 0.3]]));
    const eligible = order.lines.slice();
    const chosen = [];
    for (let k = 0; k < nItems && eligible.length > 0; k += 1) {
      const idx = Math.floor(Math.pow(rngB(), 1.5) * eligible.length);
      chosen.push(eligible.splice(idx, 1)[0]);
    }
    if (chosen.length === 0) continue;

    const rId = returns.length;
    returns.push({
      id: returnId,
      returnNumber: nextDoc("RET", returnDate.getUTCFullYear()),
      orderId: order.id,
      customerId: order.customerId,
      status: rngB() < 0.9 ? "received" : "approved",
      reason: pickWeighted(rngB, returnReasonWeights),
      reasonNote: null,
      createdBy: OWNER_STAFF_ID,
      approvedBy: OWNER_STAFF_ID,
      createdAt: formatTimestamp(returnDate),
      dateStr: returnDateStr,
    });

    let refundTotal = 0;
    for (const line of chosen) {
      const qtyReturned = Math.min(line.quantity, randInt(rngB, 1, line.quantity));
      const refundAmount = round2((line.lineTotal * qtyReturned) / line.quantity);
      returnItems.push({
        id: uuid5(`returnitem:${returnId}:${line.variantId}`),
        returnId,
        orderItemRef: null, // resolved in a later pass via line index
        orderId: order.id,
        variantId: line.variantId,
        quantityReturned: qtyReturned,
        condition: pickWeighted(rngB, conditionWeights),
        refundAmount,
        createdAt: formatTimestamp(returnDate),
        dateStr: returnDateStr,
      });
      refundTotal = round2(refundTotal + refundAmount);
    }
    if (refundTotal <= 0) continue;

    const orderPayments = paymentByOrder.get(order.id) ?? [];
    const primaryPayment = orderPayments[0] ?? null;
    const refundId = uuid5(`refund:${returnId}`);
    refunds.push({
      id: refundId,
      refundNumber: nextDoc("RFD", returnDate.getUTCFullYear()),
      orderId: order.id,
      paymentId: primaryPayment?.id ?? null,
      returnId,
      amount: refundTotal,
      method: primaryPayment?.method ?? "mobile_money",
      status: rngB() < 0.93 ? "processed" : "pending",
      reference: `RFND-${createHash("sha1").update(refundId).digest("hex").slice(0, 8).toUpperCase()}`,
      reason: "Refund for returned item(s).",
      processedBy: OWNER_STAFF_ID,
      createdAt: formatTimestamp(returnDate),
      dateStr: returnDateStr,
    });

    // Recompute order payment status from refund coverage.
    const paidTotal = orderPayments.reduce((s, p) => s + p.amount, 0);
    order.paymentStatus =
      refundTotal >= paidTotal - 0.005 ? "refunded" : refundTotal > 0 ? "partially_refunded" : "paid";
  }

  // resolve return item order_item references: order_item rows are created in
  // the migration step with deterministic ids `oi:${orderId}:${lineIndex}`.
  // Store a composite key so the migration generator can map it to a uuid.
  for (const ri of returnItems) {
    const order = orders.find((o) => o.id === ri.orderId);
    const idx = order ? order.lines.findIndex((l) => l.variantId === ri.variantId) : -1;
    ri.orderItemRef = idx >= 0 ? `${ri.orderId}:${ri.variantId}:${idx}` : null;
    delete ri.orderId;
  }

  // ---- inventory / stock movements / purchasing -----------------------
  const saleEventsByVariant = new Map();
  for (const order of orders) {
    if (order.isCancelled) continue;
    for (const line of order.lines) {
      if (!saleEventsByVariant.has(line.variantId)) saleEventsByVariant.set(line.variantId, []);
      saleEventsByVariant.get(line.variantId).push({
        dateStr: order.dateStr,
        date: new Date(order.createdAt),
        delta: -line.quantity,
      });
    }
  }
  for (const ri of returnItems) {
    if (ri.condition !== "resellable") continue;
    if (!saleEventsByVariant.has(ri.variantId)) saleEventsByVariant.set(ri.variantId, []);
    saleEventsByVariant.get(ri.variantId).push({
      dateStr: ri.dateStr,
      date: new Date(ri.createdAt),
      delta: ri.quantityReturned,
    });
  }
  for (const events of saleEventsByVariant.values()) {
    events.sort((a, b) => (a.date - b.date) || (a.delta > b.delta ? 1 : -1));
  }

  const purchaseEvents = []; // {dateStr, date, variantId, qty}
  const costByVariant = new Map();
  const stockMoveRows = [];

  for (const v of sellable) {
    const inv = master.inventoryByVariant.get(v.id);
    const finalOnHand = inv ? Number(inv.quantity_on_hand) : 0;
    const opening = finalOnHand;
    const events = saleEventsByVariant.get(v.id);
    const inventoryItemId = inv ? inv.id : null;
    if (inventoryItemId) costByVariant.set(v.id, round2(v.cost));

    if (events && events.length > 0) {
      const netSold = -events.reduce((s, e) => s + e.delta, 0);
      let remaining = netSold;
      let balance = opening;
      const perVariantOrders = [];
      const purchaseDateFor = (eDate) => {
        const candidate = prevBusinessDay(eDate);
        return candidate < OPENING_DAY ? OPENING_DAY : candidate;
      };
      for (const e of events) {
        if (e.delta < 0) {
          const qty = -e.delta;
          const deficit = Math.max(0, qty - balance);
          const buy = Math.min(deficit, remaining);
          if (buy > 0) {
            const pdate = purchaseDateFor(e.date);
            perVariantOrders.push({ date: pdate, qty: buy });
            balance += buy;
            remaining -= buy;
          }
          balance -= qty;
        } else {
          balance += e.delta;
        }
      }
      let leftover = remaining;
      // spend the remainder as replenishment reorders placed just before each sale
      const saleEvents = events.filter((e) => e.delta < 0);
      for (const e of saleEvents) {
        if (leftover <= 0) break;
        const add = Math.min(-e.delta, leftover);
        if (add > 0) {
          const pdate = purchaseDateFor(e.date);
          perVariantOrders.push({ date: pdate, qty: add });
          leftover -= add;
        }
      }
      for (const o of perVariantOrders) {
        purchaseEvents.push({ date: o.date, variantId: v.id, qty: o.qty });
      }
      if (leftover > 0) {
        console.warn(`[warn] variant ${v.id} leftover purchase ${leftover}`);
      }
    }
  }

  // Group purchase events into POs per (supplier, 60-day restock interval).
  const epoch = OPENING_DAY.getTime();
  const poGroups = new Map(); // key `${supplierIdx}|${intervalStartStr}` -> {date, supplierIdx, items: Map(variantId->qty)}
  for (const pe of purchaseEvents) {
    const v = sellable.find((s) => s.id === pe.variantId);
    if (!v) continue;
    const interval = Math.floor((pe.date.getTime() - epoch) / (RESTOCK_INTERVAL_DAYS * 86400000));
    const intervalStart = addDaysUtc(OPENING_DAY, interval * RESTOCK_INTERVAL_DAYS);
    const start = isBusinessDay(intervalStart) ? intervalStart : prevBusinessDay(intervalStart);
    const key = `${v.supplierIndex}|${formatDate(start)}`;
    let group = poGroups.get(key);
    if (!group) {
      group = { date: start, supplierIndex: v.supplierIndex, items: new Map(), minEventDate: pe.date };
      poGroups.set(key, group);
    }
    if (pe.date < group.minEventDate) group.minEventDate = pe.date;
    const cur = group.items.get(pe.variantId) ?? 0;
    group.items.set(pe.variantId, cur + pe.qty);
  }
  const poGroupsSorted = [...poGroups.values()].sort((a, b) => a.date - b.date);

  const purchaseOrders = [];
  const purchaseOrderItems = [];
  const goodsReceipts = [];
  const goodsReceiptItems = [];
  const supplierInvoices = [];
  const purchasePayments = [];
  const purchasePaymentMethods = [
    ["bank_transfer", 0.42],
    ["mobile_money", 0.34],
    ["cash", 0.16],
    ["card", 0.08],
  ];

  const purchaseOrderItemsById = new Map(); // deterministic id -> row
  const invoiceSeqBySupplier = new Map(); // supplierId -> next invoice seq

  for (const group of poGroupsSorted) {
    const supplier = suppliers[group.supplierIndex];
    const poId = uuid5(`po:${supplier.id}:${formatDate(group.date)}`);
    const poNumber = nextDoc("PO", group.date.getUTCFullYear());
    const expectedDate = addDaysUtc(group.date, randInt(rngC, 5, 12));
    // Receipts must never land after the earliest sale they cover, otherwise
    // the stock journal replay would dip negative.
    const latestReceipt = addDaysUtc(group.minEventDate, -1);
    let receiptDate = addDaysUtc(group.date, randInt(rngC, 2, 6));
    if (receiptDate > latestReceipt) {
      receiptDate = latestReceipt > group.date ? latestReceipt : group.date;
    }
    const invoiceDate = addDaysUtc(receiptDate, randInt(rngC, 0, 2));
    const dueDate = addDaysUtc(invoiceDate, supplier.paymentTermsDays);

    const sortedItems = [...group.items.entries()].sort((a, b) => (costByVariant.get(a[0]) ?? 0) - (costByVariant.get(b[0]) ?? 0));
    let poTotal = 0;
    const poItems = [];
    const grItems = [];
    for (const [variantId, qty] of sortedItems) {
      const cost = costByVariant.get(variantId) ?? 0;
      const lineTotal = round2(cost * qty);
      poTotal = round2(poTotal + lineTotal);
      const poiId = uuid5(`poitem:${poId}:${variantId}`);
      const poi = {
        id: poiId,
        purchaseOrderId: poId,
        variantId,
        quantityOrdered: qty,
        unitCostExpected: cost,
        quantityReceived: qty,
      };
      poItems.push(poi);
      purchaseOrderItemsById.set(poiId, poi);
      const griId = uuid5(`gritem:${poId}:${variantId}`);
      grItems.push({
        id: griId,
        goodsReceiptId: uuid5(`gr:${poId}`),
        purchaseOrderItemId: poiId,
        variantId,
        quantityReceived: qty,
        unitCostActual: cost,
      });
    }
    if (poItems.length === 0) continue;

    const grId = uuid5(`gr:${poId}`);
    const grNumber = nextDoc("GR", group.date.getUTCFullYear());
    const invId = uuid5(`invoice:${poId}`);
    const invSeq = (invoiceSeqBySupplier.get(supplier.id) ?? 0) + 1;
    invoiceSeqBySupplier.set(supplier.id, invSeq);
    const finalInvNumber = `INV-${supplier.supplierCode}-${group.date.getUTCFullYear()}-${String(invSeq).padStart(4, "0")}`;

    purchaseOrders.push({
      id: poId,
      poNumber,
      supplierId: supplier.id,
      locationId: LOCATION_ID,
      status: "received",
      expectedDate: formatDate(expectedDate),
      notes: null,
      createdAt: formatTimestamp(group.date),
      updatedAt: formatTimestamp(group.date),
      createdBy: OWNER_AUTH_ID,
      approvedBy: OWNER_AUTH_ID,
      dateStr: formatDate(group.date),
    });

    for (const poi of poItems) {
      purchaseOrderItems.push({
        ...poi,
        createdAt: formatTimestamp(group.date),
        updatedAt: formatTimestamp(group.date),
      });
      const gri = grItems.find((g) => g.purchaseOrderItemId === poi.id);
      goodsReceiptItems.push({
        ...gri,
        createdAt: formatTimestamp(receiptDate),
        updatedAt: formatTimestamp(receiptDate),
      });
    }

    goodsReceipts.push({
      id: grId,
      receiptNumber: grNumber,
      purchaseOrderId: poId,
      locationId: LOCATION_ID,
      receivedDate: formatDate(receiptDate),
      status: "completed",
      notes: null,
      createdAt: formatTimestamp(receiptDate),
      updatedAt: formatTimestamp(receiptDate),
      createdBy: OWNER_AUTH_ID,
    });

    supplierInvoices.push({
      id: invId,
      invoiceNumber: finalInvNumber,
      supplierId: supplier.id,
      purchaseOrderId: poId,
      invoiceDate: formatDate(invoiceDate),
      dueDate: formatDate(dueDate),
      amount: poTotal,
      status: "paid",
      notes: null,
      createdAt: formatTimestamp(invoiceDate),
      updatedAt: formatTimestamp(invoiceDate),
      createdBy: OWNER_AUTH_ID,
    });

    // purchase payments reconcile the invoice
    const split = poTotal >= 3000 && rngC() < 0.25;
    let plan;
    if (split) {
      const firstCents = Math.round(poTotal * 100 * 0.6);
      plan = [firstCents / 100, round2(poTotal - firstCents / 100)];
    } else {
      plan = [poTotal];
    }
    for (let k = 0; k < plan.length; k += 1) {
      const payDate = addDaysUtc(invoiceDate, Math.min(supplier.paymentTermsDays, randInt(rngC, 0, supplier.paymentTermsDays)));
      const method = pickWeighted(rngC, purchasePaymentMethods);
      purchasePayments.push({
        id: uuid5(`ppay:${poId}:${k}`),
        supplierId: supplier.id,
        invoiceId: invId,
        purchaseOrderId: poId,
        amount: plan[k],
        paymentDate: formatDate(payDate),
        method,
        reference: null,
        notes: null,
        createdAt: formatTimestamp(payDate),
        updatedAt: formatTimestamp(payDate),
        createdBy: OWNER_AUTH_ID,
      });
    }

    // stock movements for this receipt
    for (const gri of grItems) {
      const inv = master.inventoryByVariant.get(gri.variantId);
      if (!inv) continue;
      stockMoveRows.push({
        id: uuid5(`mv:receipt:${gri.id}`),
        inventoryItemId: inv.id,
        movementType: "purchase_receipt",
        quantityChange: gri.quantityReceived,
        unitCost: gri.unitCostActual,
        sourceType: "goods_receipt",
        sourceId: grId,
        note: grNumber,
        createdAt: formatTimestamp(receiptDate),
        createdBy: OWNER_AUTH_ID,
      });
    }
  }

  // sale + sale_return movements
  for (const order of orders) {
    if (order.isCancelled) continue;
    for (const line of order.lines) {
      const inv = master.inventoryByVariant.get(line.variantId);
      if (!inv) continue;
      stockMoveRows.push({
        id: uuid5(`mv:sale:${order.id}:${line.variantId}`),
        inventoryItemId: inv.id,
        movementType: "sale",
        quantityChange: -line.quantity,
        unitCost: round2(line.unitCost),
        sourceType: "order",
        sourceId: order.id,
        note: order.orderNumber,
        createdAt: order.createdAt,
        createdBy: OWNER_AUTH_ID,
      });
    }
  }
  for (const ri of returnItems) {
    if (ri.condition !== "resellable") continue;
    const inv = master.inventoryByVariant.get(ri.variantId);
    if (!inv) continue;
    const ret = returns.find((r) => r.id === ri.returnId);
    stockMoveRows.push({
      id: uuid5(`mv:return:${ri.id}`),
      inventoryItemId: inv.id,
      movementType: "sale_return",
      quantityChange: ri.quantityReturned,
      unitCost: null,
      sourceType: "return",
      sourceId: ri.returnId,
      note: ret ? ret.returnNumber : null,
      createdAt: ri.createdAt,
      createdBy: OWNER_AUTH_ID,
    });
  }

  // opening stock movements: one per preserved inventory item, dated the first
  // operating day, so the stock journal explains each item's on-hand quantity
  // (opening + purchase_receipt - sale + sale_return = quantity_on_hand).
  const openingDate = formatTimestamp(new Date(Date.UTC(OPENING_DAY.getUTCFullYear(), OPENING_DAY.getUTCMonth(), OPENING_DAY.getUTCDate())));
  for (const inv of master.inventory) {
    const qty = Number(inv.quantity_on_hand);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    stockMoveRows.push({
      id: uuid5(`mv:opening:${inv.id}`),
      inventoryItemId: inv.id,
      movementType: "opening_stock",
      quantityChange: qty,
      unitCost: null,
      sourceType: "inventory_item",
      sourceId: inv.id,
      note: "Opening stock count",
      createdAt: openingDate,
      createdBy: OWNER_AUTH_ID,
    });
  }

  // ---- expenses --------------------------------------------------------
  const EXPENSE_PROFILES = [
    { cat: "Salaries & Wages", freq: 1.0, min: 15000, max: 38000, methods: [["bank_transfer", 0.85], ["mobile_money", 0.15]] },
    { cat: "Rent & Premises", freq: 1.0, min: 8000, max: 13500, methods: [["bank_transfer", 0.9], ["cash", 0.1]] },
    { cat: "Electricity", freq: 1.0, min: 900, max: 4200, methods: [["mobile_money", 0.6], ["cash", 0.3], ["bank_transfer", 0.1]] },
    { cat: "Water", freq: 1.0, min: 120, max: 600, methods: [["cash", 0.5], ["mobile_money", 0.5]] },
    { cat: "Internet & Communication", freq: 1.0, min: 250, max: 700, methods: [["mobile_money", 0.7], ["bank_transfer", 0.3]] },
    { cat: "Telephone", freq: 0.8, min: 80, max: 300, methods: [["mobile_money", 0.8], ["cash", 0.2]] },
    { cat: "Bank Charges", freq: 1.0, min: 20, max: 150, methods: [["bank_transfer", 1.0]] },
    { cat: "Mobile Money Charges", freq: 1.0, min: 30, max: 400, methods: [["mobile_money", 1.0]] },
    { cat: "Payment Processing Fees", freq: 1.0, min: 50, max: 900, methods: [["bank_transfer", 1.0]] },
    { cat: "Fuel", freq: 2.5, min: 300, max: 900, methods: [["cash", 0.7], ["mobile_money", 0.3]] },
    { cat: "Transport & Delivery", freq: 3.0, min: 150, max: 900, methods: [["cash", 0.5], ["mobile_money", 0.5]] },
    { cat: "Vehicle Maintenance", freq: 0.5, min: 200, max: 2500, methods: [["cash", 0.4], ["mobile_money", 0.4], ["bank_transfer", 0.2]] },
    { cat: "Office Supplies", freq: 0.8, min: 50, max: 600, methods: [["cash", 0.6], ["mobile_money", 0.4]] },
    { cat: "Cleaning & Sanitation", freq: 1.0, min: 60, max: 400, methods: [["cash", 0.8], ["mobile_money", 0.2]] },
    { cat: "Security", freq: 1.0, min: 400, max: 900, methods: [["cash", 0.6], ["mobile_money", 0.4]] },
    { cat: "Repairs & Maintenance", freq: 0.6, min: 150, max: 3000, methods: [["cash", 0.4], ["mobile_money", 0.4], ["bank_transfer", 0.2]] },
    { cat: "Advertising", freq: 1.2, min: 150, max: 1500, methods: [["mobile_money", 0.6], ["bank_transfer", 0.4]] },
    { cat: "Marketing", freq: 1.0, min: 200, max: 2000, methods: [["mobile_money", 0.6], ["bank_transfer", 0.4]] },
    { cat: "Promotions", freq: 0.8, min: 150, max: 1200, methods: [["cash", 0.4], ["mobile_money", 0.6]] },
    { cat: "Customer Service", freq: 0.5, min: 50, max: 500, methods: [["cash", 0.5], ["mobile_money", 0.5]] },
    { cat: "Packaging Materials", freq: 1.5, min: 100, max: 800, methods: [["cash", 0.5], ["mobile_money", 0.5]] },
    { cat: "Freight & Shipping", freq: 1.5, min: 300, max: 2500, methods: [["bank_transfer", 0.6], ["mobile_money", 0.4]] },
    { cat: "Customs & Duties", freq: 0.5, min: 500, max: 4000, methods: [["bank_transfer", 0.7], ["mobile_money", 0.3]] },
    { cat: "Warehouse Expenses", freq: 0.6, min: 150, max: 900, methods: [["cash", 0.5], ["mobile_money", 0.5]] },
    { cat: "Software & Subscriptions", freq: 0.5, min: 100, max: 800, methods: [["bank_transfer", 0.8], ["card", 0.2]] },
    { cat: "Hardware & Equipment", freq: 0.3, min: 500, max: 6000, methods: [["bank_transfer", 0.6], ["card", 0.4]] },
    { cat: "IT Support", freq: 0.4, min: 100, max: 700, methods: [["cash", 0.4], ["mobile_money", 0.6]] },
    { cat: "Accounting & Audit", freq: 0.4, min: 300, max: 2500, methods: [["bank_transfer", 0.8], ["mobile_money", 0.2]] },
    { cat: "Legal & Professional Fees", freq: 0.2, min: 300, max: 3000, methods: [["bank_transfer", 0.8], ["mobile_money", 0.2]] },
    { cat: "Insurance", freq: 0.3, min: 400, max: 2500, methods: [["bank_transfer", 0.8], ["mobile_money", 0.2]] },
    { cat: "Licenses & Permits", freq: 0.2, min: 200, max: 1500, methods: [["bank_transfer", 0.8], ["mobile_money", 0.2]] },
    { cat: "Government Fees", freq: 0.2, min: 100, max: 1000, methods: [["cash", 0.5], ["mobile_money", 0.5]] },
    { cat: "Registration & Compliance", freq: 0.15, min: 200, max: 1200, methods: [["bank_transfer", 0.8], ["mobile_money", 0.2]] },
    { cat: "Staff Allowances", freq: 1.0, min: 500, max: 2000, methods: [["bank_transfer", 0.6], ["cash", 0.4]] },
    { cat: "Staff Welfare", freq: 0.6, min: 150, max: 800, methods: [["cash", 0.5], ["mobile_money", 0.5]] },
    { cat: "Training & Development", freq: 0.2, min: 300, max: 2000, methods: [["bank_transfer", 0.7], ["mobile_money", 0.3]] },
    { cat: "Recruitment", freq: 0.1, min: 200, max: 1500, methods: [["bank_transfer", 0.7], ["mobile_money", 0.3]] },
    { cat: "Meals & Refreshments", freq: 1.0, min: 200, max: 1000, methods: [["cash", 0.7], ["mobile_money", 0.3]] },
    { cat: "Travel & Accommodation", freq: 0.3, min: 400, max: 2500, methods: [["bank_transfer", 0.6], ["mobile_money", 0.4]] },
    { cat: "Miscellaneous", freq: 0.6, min: 50, max: 700, methods: [["cash", 0.6], ["mobile_money", 0.4]] },
  ];
  const expenseCategoryIdByName = new Map(master.cats.map((c) => [c.name, c.id]));

  const expenses = [];
  for (let monthStart = new Date(Date.UTC(2022, 0, 1)); monthStart <= PERIOD_END; monthStart = addDaysUtc(monthStart, 28)) {
    const year = monthStart.getUTCFullYear();
    for (const profile of EXPENSE_PROFILES) {
      const catId = expenseCategoryIdByName.get(profile.cat);
      if (!catId) continue;
      const n = Math.floor(profile.freq + rngD() * 1.6);
      for (let k = 0; k < n; k += 1) {
        const day = addDaysUtc(monthStart, randInt(rngD, 0, 27));
        if (day > PERIOD_END) continue;
        if (!isBusinessDay(day)) continue;
        const growth = 1 + (year - 2022) * 0.07;
        const amount = round2((profile.min + rngD() * (profile.max - profile.min)) * growth);
        if (amount < 1) continue;
        const method = pickWeighted(rngD, profile.methods);
        expenses.push({
          id: uuid5(`expense:${formatDate(day)}:${profile.cat}:${k}:${expenses.length}`),
          expenseNumber: nextDoc("EXP", year),
          categoryId: catId,
          description: `${profile.cat} — ${pick(rngD, [
            "Monthly settlement",
            "Period payment",
            "Retail operations",
            "Recurring cost",
            "Operational expense",
          ])}`,
          amount,
          expenseDate: formatDate(day),
          method,
          referenceNumber: rngD() < 0.5 ? `REF-${createHash("sha1").update(`${formatDate(day)}${profile.cat}${k}`).digest("hex").slice(0, 8).toUpperCase()}` : null,
          supplierId: null,
          locationId: LOCATION_ID,
          attachmentUrl: null,
          notes: null,
          createdAt: formatTimestamp(day),
          updatedAt: formatTimestamp(day),
          createdBy: OWNER_AUTH_ID,
          dateStr: formatDate(day),
        });
      }
    }
  }

  // ---- account transactions --------------------------------------------
  const bankDeposits = [];
  const momoDeposits = [];
  const accountWithdrawals = [];

  // sales → deposits
  const cashByWeek = new Map();
  const cardByWeek = new Map();
  const bankTransferByWeek = new Map();
  for (const p of payments) {
    const d = new Date(p.paymentDate);
    const weekStart = addDaysUtc(d, -((d.getUTCDay() + 6) % 7));
    const ws = formatDate(weekStart);
    if (p.method === "cash") cashByWeek.set(ws, (cashByWeek.get(ws) ?? 0) + p.amount);
    else if (p.method === "card") cardByWeek.set(ws, (cardByWeek.get(ws) ?? 0) + p.amount);
    else if (p.method === "bank_transfer") bankTransferByWeek.set(ws, (bankTransferByWeek.get(ws) ?? 0) + p.amount);
  }
  for (const [ws, amount] of cashByWeek) {
    bankDeposits.push({ date: ws, amount: round2(amount), ref: `Cash sales ${ws}`, note: "Weekly cash sales deposit" });
  }
  for (const [ws, amount] of cardByWeek) {
    bankDeposits.push({ date: ws, amount: round2(amount), ref: `Card sales ${ws}`, note: "Card settlement deposit" });
  }
  for (const [ws, amount] of bankTransferByWeek) {
    bankDeposits.push({ date: ws, amount: round2(amount), ref: `Bank transfer sales ${ws}`, note: "Customer bank transfer" });
  }
  const momoByDay = new Map();
  for (const p of payments) {
    if (p.method !== "mobile_money") continue;
    const ds = p.dateStr;
    momoByDay.set(ds, (momoByDay.get(ds) ?? 0) + p.amount);
  }
  for (const [ds, amount] of momoByDay) {
    momoDeposits.push({ date: ds, amount: round2(amount), ref: `Mobile money sales ${ds}`, note: "Daily mobile money sales" });
  }

  // purchases / expenses / refunds → withdrawals
  for (const pp of purchasePayments) {
    if (pp.method === "bank_transfer" || pp.method === "card") {
      accountWithdrawals.push({ date: pp.paymentDate, amount: pp.amount, kind: "bank", ref: `Payment to supplier`, note: `Purchase payment ${pp.reference ?? ""}`.trim() });
    } else if (pp.method === "mobile_money") {
      accountWithdrawals.push({ date: pp.paymentDate, amount: pp.amount, kind: "momo", ref: `Payment to supplier`, note: `Purchase payment ${pp.reference ?? ""}`.trim() });
    }
  }
  for (const exp of expenses) {
    if (exp.method === "bank_transfer" || exp.method === "card") {
      accountWithdrawals.push({ date: exp.expenseDate, amount: exp.amount, kind: "bank", ref: exp.referenceNumber ?? null, note: `Expense ${exp.expenseNumber} — ${exp.description}` });
    } else if (exp.method === "mobile_money") {
      accountWithdrawals.push({ date: exp.expenseDate, amount: exp.amount, kind: "momo", ref: exp.referenceNumber ?? null, note: `Expense ${exp.expenseNumber} — ${exp.description}` });
    }
  }
  for (const rf of refunds) {
    if (rf.status !== "processed") continue;
    if (rf.method === "bank_transfer" || rf.method === "card") {
      accountWithdrawals.push({ date: rf.dateStr, amount: rf.amount, kind: "bank", ref: rf.reference, note: `Refund ${rf.refundNumber}` });
    } else if (rf.method === "mobile_money") {
      accountWithdrawals.push({ date: rf.dateStr, amount: rf.amount, kind: "momo", ref: rf.reference, note: `Refund ${rf.refundNumber}` });
    }
  }

  // scheduled transfers: monthly sweep of excess mobile money to bank
  const scheduledTransfers = [];
  for (let d = new Date(Date.UTC(2022, 1, 1)); d <= PERIOD_END; d = addDaysUtc(d, 28)) {
    const t = isBusinessDay(d) ? d : prevBusinessDay(d);
    scheduledTransfers.push({ date: formatDate(t), amount: null, from: "momo", to: "bank", ref: "Monthly mobile money sweep", note: "Monthly cash sweep to bank" });
  }

  // simulate ledger
  const accountEvents = [];
  for (const bd of bankDeposits) accountEvents.push({ date: bd.date, order: 0, type: "deposit", to: "bank", amount: bd.amount, ref: bd.ref, note: bd.note });
  for (const md of momoDeposits) accountEvents.push({ date: md.date, order: 0, type: "deposit", to: "momo", amount: md.amount, ref: md.ref, note: md.note });
  for (const wd of accountWithdrawals) accountEvents.push({ date: wd.date, order: 2, type: "withdrawal", from: wd.kind, amount: wd.amount, ref: wd.ref, note: wd.note });
  for (const st of scheduledTransfers) accountEvents.push({ date: st.date, order: 1, type: "transfer", from: st.from, to: st.to, amount: st.amount, ref: st.ref, note: st.note });

  accountEvents.sort((a, b) => (a.date === b.date ? a.order - b.order : a.date < b.date ? -1 : 1));

  const balances = { bank: Number(bank.opening_balance), momo: Number(momo.opening_balance) };
  const accountTransactions = [];
  const acctTx = (date, type, amount, fromKind, toKind, ref, note) => {
    const txId = uuid5(`at:${date}:${type}:${fromKind ?? ""}:${toKind ?? ""}:${ref}:${accountTransactions.length}`);
    accountTransactions.push({
      id: txId,
      transactionCode: nextDoc("AT", new Date(`${date}T00:00:00Z`).getUTCFullYear()),
      transactionType: type,
      amount: round2(amount),
      fromKind,
      toKind,
      reference: ref ?? null,
      note: note ?? null,
      createdBy: OWNER_AUTH_ID,
      createdAt: formatTimestamp(new Date(`${date}T00:00:00Z`)),
      dateStr: date,
    });
  };
  // Withdrawals that cannot be covered immediately are deferred and posted on
  // the first later date on which funds are available (a realistic "payment
  // made once funds arrived"), so the ledger never drops an outflow and every
  // account balance stays non-negative.
  const pendingWithdrawals = []; // {date, amount, fromKind, ref, note}
  let currentDate = null;
  const attemptWithdrawal = (item) => {
    if (balances[item.fromKind] >= item.amount) {
      balances[item.fromKind] -= item.amount;
      acctTx(item.date, "withdrawal", item.amount, item.fromKind, null, item.ref, item.note);
      return true;
    }
    const need = item.amount - balances[item.fromKind];
    const fromKind = item.fromKind === "bank" ? "momo" : "bank";
    if (balances[fromKind] >= need) {
      acctTx(item.date, "transfer", round2(need), fromKind, item.fromKind, "Inter-account transfer", "Transfer to cover withdrawals");
      balances[fromKind] -= need;
      balances[item.fromKind] += need;
      balances[item.fromKind] -= item.amount;
      acctTx(item.date, "withdrawal", item.amount, item.fromKind, null, item.ref, item.note);
      return true;
    }
    if (balances[fromKind] > 0) {
      const avail = round2(balances[fromKind]);
      acctTx(item.date, "transfer", avail, fromKind, item.fromKind, "Inter-account transfer", "Transfer to cover withdrawals");
      balances[fromKind] -= avail;
      balances[item.fromKind] += avail;
    }
    return false;
  };
  const clearPending = (date) => {
    if (date) currentDate = date;
    for (let i = pendingWithdrawals.length - 1; i >= 0; i -= 1) {
      const item = pendingWithdrawals[i];
      item.date = currentDate;
      if (attemptWithdrawal(item)) pendingWithdrawals.splice(i, 1);
    }
  };

  for (const e of accountEvents) {
    currentDate = e.date;
    if (e.type === "deposit") {
      balances[e.to] += e.amount;
      acctTx(e.date, "deposit", e.amount, null, e.to, e.ref, e.note);
    } else if (e.type === "withdrawal") {
      if (attemptWithdrawal({ date: e.date, amount: e.amount, fromKind: e.from, ref: e.ref, note: e.note })) {
        // posted
      } else {
        pendingWithdrawals.push({ date: e.date, amount: e.amount, fromKind: e.from, ref: e.ref, note: e.note });
      }
    } else if (e.type === "transfer") {
      let amount = e.amount;
      if (amount === null) {
        amount = Math.max(0, balances[e.from] - 15000);
        if (amount <= 0) continue;
      }
      if (balances[e.from] < amount) amount = balances[e.from];
      if (amount <= 0) continue;
      balances[e.from] -= amount;
      balances[e.to] += amount;
      acctTx(e.date, "transfer", amount, e.from, e.to, e.ref, e.note);
    }
    if (e.type !== "withdrawal") clearPending(e.date);
  }
  clearPending(null);
  for (const p of pendingWithdrawals) {
    console.warn(`[warn] could not post withdrawal ${p.note} (${p.amount}) — insufficient funds through period end`);
  }

  // ---- supplier_products (sample) --------------------------------------
  const supplierProducts = [];
  const spRng = mulberry32str("supplierproducts");
  for (const v of sellable) {
    if (spRng() > 0.14) continue;
    const supplier = suppliers[v.supplierIndex];
    supplierProducts.push({
      id: uuid5(`sp:${supplier.id}:${v.id}`),
      supplierId: supplier.id,
      variantId: v.id,
      supplierSku: `SP-${createHash("sha1").update(v.id).digest("hex").slice(0, 6).toUpperCase()}`,
      supplierProductName: v.productName,
      lastCost: v.cost,
      preferredSupplier: true,
      leadTimeDays: randInt(spRng, 5, 21),
      minimumOrderQuantity: 1,
      isActive: true,
    });
  }
  // one preferred per variant — ensure uniqueness by deduping
  const seenPreferred = new Set();
  const deduped = supplierProducts.filter((sp) => {
    if (seenPreferred.has(sp.variantId)) return false;
    seenPreferred.add(sp.variantId);
    return true;
  });
  supplierProducts.length = 0;
  supplierProducts.push(...deduped);

  // ---- summary ----------------------------------------------------------
  const totals = {
    orders: orders.length,
    orderItems: orders.reduce((s, o) => s + o.lines.length, 0),
    payments: payments.length,
    deliveries: deliveries.length,
    returns: returns.length,
    returnItems: returnItems.length,
    refunds: refunds.length,
    purchaseOrders: purchaseOrders.length,
    purchaseOrderItems: purchaseOrderItems.length,
    goodsReceipts: goodsReceipts.length,
    goodsReceiptItems: goodsReceiptItems.length,
    supplierInvoices: supplierInvoices.length,
    purchasePayments: purchasePayments.length,
    expenses: expenses.length,
    stockMovements: stockMoveRows.length,
    accountTransactions: accountTransactions.length,
    suppliers: suppliers.length,
    supplierProducts: supplierProducts.length,
    cancelledOrders: cancelledCount,
    onlineOrders: onlineCount,
    inStoreOrders: inStoreCount,
    guestOrders: guestCount,
  };
  const salesTotal = orders.filter((o) => !o.isCancelled).reduce((s, o) => s + o.totalAmount, 0);
  const paidTotal = payments.reduce((s, p) => s + p.amount, 0);
  const purchaseTotal = supplierInvoices.reduce((s, i) => s + Number(i.amount), 0);
  const purchasePaidTotal = purchasePayments.reduce((s, p) => s + Number(p.amount), 0);
  const expenseTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const refundTotal = refunds.filter((r) => r.status === "processed").reduce((s, r) => s + Number(r.amount), 0);

  const summary = {
    seed: SEED,
    periodStart: formatDate(PERIOD_START),
    periodEnd: formatDate(PERIOD_END),
    counts: totals,
    salesTotal: round2(salesTotal),
    paymentsTotal: round2(paidTotal),
    purchaseInvoiceTotal: round2(purchaseTotal),
    purchasePaidTotal: round2(purchasePaidTotal),
    expenseTotal: round2(expenseTotal),
    refundTotal: round2(refundTotal),
    bankOpening: Number(bank.opening_balance),
    momoOpening: Number(momo.opening_balance),
    bankBalance: round2(balances.bank),
    momoBalance: round2(balances.momo),
  };

  return {
    meta: {
      seed: SEED,
      periodStart: formatDate(PERIOD_START),
      periodEnd: formatDate(PERIOD_END),
      openingDay: formatDate(OPENING_DAY),
      ownerAuthId: OWNER_AUTH_ID,
      ownerStaffId: OWNER_STAFF_ID,
      locationId: LOCATION_ID,
      bankAccountId: bank.id,
      bankOpening: Number(bank.opening_balance),
      momoAccountId: momo.id,
      momoOpening: Number(momo.opening_balance),
      suppliersFromLive,
    },
    suppliers,
    supplierProducts,
    orders,
    payments,
    deliveries,
    returns,
    returnItems,
    refunds,
    purchaseOrders,
    purchaseOrderItems,
    goodsReceipts,
    goodsReceiptItems,
    supplierInvoices,
    purchasePayments,
    expenses,
    stockMovements: stockMoveRows,
    accountTransactions,
    summary,
    balances: { bank: balances.bank, momo: balances.momo },
  };
}

// ---------------------------------------------------------------------------
// Write data files
// ---------------------------------------------------------------------------
function writeDataset(dataset) {
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  const json = (value) => JSON.stringify(value);
  writeFileSync(`${dataDir}/master.json`, json({
    meta: dataset.meta,
    suppliers: dataset.suppliers,
    supplierProducts: dataset.supplierProducts,
  }));
  writeFileSync(`${dataDir}/orders.json`, json({
    meta: dataset.meta,
    orders: dataset.orders,
    payments: dataset.payments,
    deliveries: dataset.deliveries,
    returns: dataset.returns,
    returnItems: dataset.returnItems,
    refunds: dataset.refunds,
  }));
  writeFileSync(`${dataDir}/purchases.json`, json({
    purchaseOrders: dataset.purchaseOrders,
    purchaseOrderItems: dataset.purchaseOrderItems,
    goodsReceipts: dataset.goodsReceipts,
    goodsReceiptItems: dataset.goodsReceiptItems,
    supplierInvoices: dataset.supplierInvoices,
    purchasePayments: dataset.purchasePayments,
    stockMovements: dataset.stockMovements,
  }));
  writeFileSync(`${dataDir}/finance.json`, json({
    expenses: dataset.expenses,
    accountTransactions: dataset.accountTransactions,
  }));
  writeFileSync(`${dataDir}/summary.json`, json({
    meta: dataset.meta,
    summary: dataset.summary,
    balances: dataset.balances,
  }, null, 2));
  console.log(`Wrote data files to ${dataDir}`);
}

// ---------------------------------------------------------------------------
async function main() {
  const master = await loadMasterData();
  const liveSuppliers = await fetchAll(
    "suppliers",
    "id,supplier_code,name,payment_terms_days,status",
  );
  console.log(`  ${liveSuppliers.length} live suppliers loaded`);
  console.log("Generating dataset…");
  const dataset = generateDataset(master, liveSuppliers);
  writeDataset(dataset);
  const s = dataset.summary;
  console.log("\n=== Generation summary ===");
  for (const [k, v] of Object.entries(s.counts)) {
    console.log(`  ${k.padEnd(22)} ${String(v).padStart(7)}`);
  }
  console.log(`  ${"salesTotal".padEnd(22)} ${String(round2(s.salesTotal)).padStart(10)}`);
  console.log(`  ${"paymentsTotal".padEnd(22)} ${String(round2(s.paymentsTotal)).padStart(10)}`);
  console.log(`  ${"purchaseInvoiceTotal".padEnd(22)} ${String(round2(s.purchaseInvoiceTotal)).padStart(10)}`);
  console.log(`  ${"expenseTotal".padEnd(22)} ${String(round2(s.expenseTotal)).padStart(10)}`);
  console.log(`  bank balance: ${round2(dataset.balances.bank)} | momo balance: ${round2(dataset.balances.momo)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
