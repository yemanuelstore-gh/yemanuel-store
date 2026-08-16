// Expansion catalogue generator.
// Reads the 19 expansion data files (scripts/catalogue-data/expansion-*.mjs),
// the live catalogue snapshot (live-snapshot.json), the live category tree
// (categories.json) plus the migration-19 categories (African Wear subtree,
// printers) and emits:
//   - supabase/migrations/20260815000020_stage_17_catalogue_expansion.sql
//   - scripts/catalogue-data/expansion-image-manifest.json   (append-only)
//   - scripts/catalogue-data/expansion-batch-report.json     (batch audit)
//
// The migration is deterministic and idempotent, mirroring stage 14:
//   - brands/products/variants use ON CONFLICT DO NOTHING
//   - images/prices/inventory are delete-scoped by the expansion SKU list
//     (temp table) then re-inserted, so re-running converges
//   - prices.created_by resolves to the owner auth user (stage 13a)
//   - inventory lands at ACCRA-STORE
//   - temporary app.exp_* lookup helpers are dropped at the end
//
// Nothing here modifies the 3,173 live products, the 144 protected real
// products, the category tree, locations, orders, customers or auth users.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;
const dataDir = `${root}/scripts/catalogue-data`;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------
const expansionFiles = readFileSync(`${dataDir}/expansion-manifest.txt`, "utf8")
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const snapshot = JSON.parse(readFileSync(`${dataDir}/live-snapshot.json`, "utf8"));
const liveCategories = JSON.parse(readFileSync(`${dataDir}/categories.json`, "utf8"));

// Categories that do not exist in the live tree but are created by migration
// 19 (20260815000019_stage_16_african_wear_categories.sql) which runs before
// this migration. Products in these categories are still valid.
const MIGRATION_19_CATEGORIES = new Set([
  "african-wear",
  "ankara-wear",
  "kente-wear",
  "african-print-dresses",
  "african-print-shirts",
  "african-print-trousers",
  "kaftans",
  "agbada",
  "dashiki",
  "smock-fugu",
  "african-wedding-wear",
  "african-event-wear",
  "african-casual-wear",
  "african-office-wear",
  "african-kids-wear",
  "headwraps",
  "african-bags",
  "african-footwear",
  "african-jewelry",
  "beaded-accessories",
  "kente-accessories",
  "printers",
]);

const VALID_CATEGORIES = new Set([
  ...liveCategories.map((c) => c.slug),
  ...MIGRATION_19_CATEGORIES,
]);

// Brand names that describe the product rather than a maker. These map to a
// NULL brand_id (unbranded), matching the "generic" convention of stage 14.
const UNBRANDED = new Set([
  "Audio Cable",
  "Braided Hair",
  "CCTV Kit",
  "Desktop Accessory",
  "Fitness Tracker",
  "Home Essentials",
  "Home Speaker",
  "Home Ups",
  "Laptop Accessory",
  "Laptop Bag",
  "Laptop Stand",
  "Mic Arm",
  "Mic Stand",
  "Photography Kit",
  "Pop Filter",
  "Power Adapter",
  "Projector",
  "Ring Light Stand",
  "Sewing Kit",
  "Shaver",
  "Shower Head",
  "Smart Camera",
  "Smart Watch",
  "Solar Fans",
  "Soundcard",
  "Storage Boxes",
  "Trimmer",
  "Webcam Kit",
  "Wireless Set",
  "Wooden",
]);

// Brand alias normalisation (expansion data -> canonical brand name).
const BRAND_ALIASES = {
  "M&S": "Marks & Spencer",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'&]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalize(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
}

function esc(value) {
  return String(value).replace(/'/g, "''");
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Live catalogue guards (dedupe + collision protection)
// ---------------------------------------------------------------------------
const liveSlugs = new Set(snapshot.products.map((p) => p.slug));
const liveNames = new Set(snapshot.products.map((p) => p.name.toLowerCase()));
const liveNormalized = new Set(snapshot.products.map((p) => p.normalized));
const liveSkus = new Set(snapshot.skus);
const liveBrandByNormalized = new Map();
for (const b of snapshot.brands) liveBrandByNormalized.set(b.normalized, b.slug);

// ---------------------------------------------------------------------------
// Load expansion rows
// ---------------------------------------------------------------------------
const rows = [];
for (const file of expansionFiles) {
  const mod = await import(`${dataDir}/${file}`);
  const dept = file
    .replace("expansion-", "")
    .replace(".mjs", "")
    .split("-")[0];
  const map = {
    mobile: "mobile",
    electronics: "electronics",
    gaming: "gaming",
    fashion: "fashion",
    african: "fashion",
    cosmetics: "cosmetics",
    home: "home",
  };
  for (const p of mod.PRODUCTS) {
    rows.push({ dept: map[dept] ?? "home", category: p[0], brand: String(p[1]), name: String(p[2]).trim(), price: Number(p[3]), opts: p[4] ?? {} });
  }
}

// ---------------------------------------------------------------------------
// Dedupe + validate
// ---------------------------------------------------------------------------
const rejects = { duplicateName: [], duplicateNormalized: [], missingPrice: [], invalidCategory: [], invalidBrand: [], missingName: [] };
const seenNormalized = new Set();

function brandSlugFor(rawBrand) {
  if (!rawBrand) return null;
  const name = BRAND_ALIASES[rawBrand] ?? rawBrand;
  if (UNBRANDED.has(name)) return null;
  const n = normalize(name);
  if (liveBrandByNormalized.has(n)) return liveBrandByNormalized.get(n);
  return { slug: slugify(name), name };
}

const accepted = [];
const newBrands = new Map();

for (const r of rows) {
  if (!r.name) {
    rejects.missingName.push(r);
    continue;
  }
  if (!Number.isFinite(r.price) || r.price <= 0) {
    rejects.missingPrice.push(r);
    continue;
  }
  if (!VALID_CATEGORIES.has(r.category)) {
    rejects.invalidCategory.push(r);
    continue;
  }
  const exact = r.name.toLowerCase();
  const norm = normalize(r.name);
  if (liveNames.has(exact) || liveNormalized.has(norm)) {
    rejects.duplicateName.push(r);
    continue;
  }
  if (seenNormalized.has(norm)) {
    rejects.duplicateNormalized.push(r);
    continue;
  }
  seenNormalized.add(norm);
  const brand = brandSlugFor(r.brand);
  if (brand === undefined) {
    rejects.invalidBrand.push(r);
    continue;
  }
  if (brand && typeof brand === "object") {
    newBrands.set(brand.slug, brand.name);
  }
  r.brandSlug = brand ? (typeof brand === "object" ? brand.slug : brand) : null;
  accepted.push(r);
}

// ---------------------------------------------------------------------------
// Slugs & SKUs
// ---------------------------------------------------------------------------
const usedSlugs = new Set(liveSlugs);
for (const p of accepted) {
  const base = slugify(p.name);
  let slug = base;
  let n = 1;
  while (usedSlugs.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  usedSlugs.add(slug);
  p.slug = slug;
}
if (new Set(accepted.map((p) => p.slug)).size !== accepted.length) {
  throw new Error("Duplicate product slugs generated");
}

function brandCode(brandSlug) {
  if (!brandSlug) return "YS";
  return (brandSlug.replace(/[^a-z0-9]/g, "").toUpperCase() || "YS").slice(0, 6);
}

const brandCounters = new Map();
const variantRows = [];
const priceRows = [];
const saleRows = [];
const imageRows = [];
const inventoryRows = [];

accepted.forEach((p, index) => {
  const code = brandCode(p.brandSlug);
  const seq = (brandCounters.get(code) ?? 1000) + 1;
  brandCounters.set(code, seq);
  const skuBase = `${code}-${String(seq).padStart(4, "0")}`;

  const createdDaysAgo = 20 + ((index * 37) % 340);
  p.created_at = new Date(Date.UTC(2026, 7, 1) - createdDaysAgo * 86400000).toISOString();

  const variants = variantsFor(p);
  p.variants = variants;
  variants.forEach((v, vi) => {
    let sku = `${skuBase}-${vi + 1}`;
    let bump = 1;
    while (liveSkus.has(sku)) {
      bump += 1;
      sku = `${skuBase}-${vi + 1}-${bump}`;
    }
    const selling = round2(Math.max(p.price + Number(v.delta ?? 0), 1));
    const sale = saleFor(p, v);
    variantRows.push({ productSlug: p.slug, name: v.name, sku, options: v.options });
    priceRows.push({ productSlug: p.slug, sku, amount: selling });
    if (sale !== null) saleRows.push({ productSlug: p.slug, sku, amount: sale });
    inventoryRows.push({ sku, qty: qtyFor(p.dept, index, vi), cost: round2(selling * 0.62) });
  });

  imageRows.push({
    productSlug: p.slug,
    url: `/images/products/${p.slug}.svg`,
    alt: `${p.name} — Yemanuel Store`,
    sortOrder: 0,
    isPrimary: true,
  });
});

function variantsFor(p) {
  const o = p.opts;
  const out = [];
  const seen = new Set();
  const push = (name, options, delta = 0) => {
    const key = normalize(name);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ name, options, delta: Number(delta ?? 0) });
  };
  if (Array.isArray(o.v) && o.v.length > 0) {
    for (const v of o.v) push(String(v.n ?? "Default"), v.o ?? {}, Number(v.d ?? 0));
    return out;
  }
  const colors = Array.isArray(o.colors) ? o.colors.filter((c) => c) : [];
  const sizes = Array.isArray(o.sizes) ? o.sizes.filter((s) => s) : [];
  const eus = Array.isArray(o.eu) ? o.eu.filter((e) => e !== null && e !== undefined) : [];
  if (sizes.length > 0 && colors.length > 0) {
    for (const sz of sizes) for (const c of colors) push(`${sz} / ${c}`, { Size: String(sz), Colour: String(c) });
    return out;
  }
  if (sizes.length > 0) {
    for (const sz of sizes) push(String(sz), { Size: String(sz) });
    return out;
  }
  if (eus.length > 0 && colors.length > 0) {
    for (const eu of eus) for (const c of colors) push(`${c} / EU ${eu}`, { Size: `EU ${eu}`, Colour: String(c) });
    return out;
  }
  if (eus.length > 0) {
    for (const eu of eus) push(`EU ${eu}`, { Size: `EU ${eu}` });
    return out;
  }
  if (colors.length > 0) {
    for (const c of colors) push(String(c), { Colour: String(c) });
    return out;
  }
  push("Default", {});
  return out;
}

function saleFor(p, v) {
  const sale = p.opts.sale;
  if (sale === undefined || sale === null) return null;
  const selling = round2(Math.max(p.price + Number(v.delta ?? 0), 1));
  let candidate = null;
  if (sale === "auto") {
    const discount = 6 + ((accepted.indexOf(p) * 7) % 11);
    candidate = round2(p.price * ((100 - discount) / 100));
  } else if (Number.isFinite(Number(sale))) {
    candidate = Number(sale);
  }
  if (candidate === null) return null;
  candidate = round2(Math.max(candidate + Number(v.delta ?? 0), 1));
  return candidate < selling ? candidate : null;
}

function qtyFor(dept, index, vi) {
  const i = index + vi * 3;
  switch (dept) {
    case "mobile": return 4 + (i * 7) % 15;
    case "electronics": return 4 + (i * 13) % 17;
    case "gaming": return 3 + (i * 11) % 13;
    case "fashion": return 8 + (i * 17) % 33;
    case "cosmetics": return 8 + (i * 19) % 33;
    case "home": return 5 + (i * 23) % 21;
    default: return 10;
  }
}

function buildDescription(p) {
  const brand = p.brandSlug ? (newBrands.get(p.brandSlug) ?? brandNameForLive(p.brandSlug)) : "";
  const specs = (p.opts.specs ?? []).slice(0, 3).join(" · ");
  const lead = brand ? `${p.name} — ${brand}.` : `${p.name}.`;
  const middle = specs ? ` ${specs}.` : "";
  const fresh = p.opts.new ? " New arrival." : "";
  return `${lead}${middle}${fresh} Genuine, quality-checked and ready for delivery across Ghana at Yemanuel Store.`;
}

const liveBrandSlugToName = new Map(snapshot.brands.map((b) => [b.slug, b.name]));
function brandNameForLive(slug) {
  return liveBrandSlugToName.get(slug) ?? slug;
}

function buildBrandDescription(name) {
  return `${name} — quality-checked products available at Yemanuel Store in Ghana.`;
}

// ---------------------------------------------------------------------------
// Emit SQL
// ---------------------------------------------------------------------------
const lines = [];
const push = (s = "") => lines.push(s);

const brandRows = [...newBrands.entries()]
  .map(([slug, name]) => ({ slug, name }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

push("-- Stage 17: catalogue expansion (second batch).");
push("--");
push("-- Adds the expansion catalogue researched from Ghanaian retail sources");
push("-- (Jumia GH, Melcom, CompuGhana, Telefonika, Woodin, GTP, Kente");
push("-- Republic, Bonwire and other Ghanaian/African brands). Priced in GHS");
push("-- from observed market prices.");
push(`--   ${accepted.length} products, ${brandRows.length} new brands,`);
push(`--   ${variantRows.length} variants, ${imageRows.length} image rows,`);
push(`--   ${priceRows.length} selling + ${saleRows.length} sale price rows,`);
push(`--   ${inventoryRows.length} inventory rows (ACCRA-STORE).`);
push("--");
push("-- Idempotency: brands/products/variants use ON CONFLICT DO NOTHING.");
push("-- Images, prices and inventory are delete-scoped by the expansion SKU");
push("-- list (temp table) and re-inserted, so re-running converges.");
push("-- prices.created_by resolves to the stage 13a owner auth user.");
push("-- The 3,173 live products, 144 protected real products, category tree,");
push("-- locations, orders, customers and auth users are never touched.");
push("--");
push("-- No schema changes are made here.");
push("");
push("set search_path = public, extensions;");
push("");

// Helpers
push("-- ---------------------------------------------------------------------");
push("-- Temporary lookup helpers (dropped at the end of this migration)");
push("-- ---------------------------------------------------------------------");
push("create or replace function app.exp_owner_id()");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from auth.users where email = 'owner@yemanuelstore.com' limit 1;");
push("$$;");
push("");
push("create or replace function app.exp_location_id()");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.locations where code = 'ACCRA-STORE' limit 1;");
push("$$;");
push("");
push("create or replace function app.exp_category_id(p_slug text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.categories where slug = p_slug limit 1;");
push("$$;");
push("");
push("create or replace function app.exp_brand_id(p_slug text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.brands where slug = p_slug limit 1;");
push("$$;");
push("");
push("create or replace function app.exp_product_id(p_slug text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.products where slug = p_slug limit 1;");
push("$$;");
push("");
push("create or replace function app.exp_variant_id(p_sku text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.product_variants where sku = p_sku limit 1;");
push("$$;");
push("");

// 1. Brands
push("-- ---------------------------------------------------------------------");
push("-- 1. New brands");
push("-- ---------------------------------------------------------------------");
push("insert into public.brands (name, slug, description, status)");
push("select v.name, v.slug, v.description, 'active'::public.entity_status");
push("from (values");
brandRows.forEach((b, i) => {
  push(`  ('${esc(b.name)}', '${b.slug}', '${esc(buildBrandDescription(b.name))}')${i === brandRows.length - 1 ? "" : ","}`);
});
push(") as v(name, slug, description)");
push("on conflict (slug) do nothing;");
push("");

// 2. Expansion SKU list (temp table)
push("-- ---------------------------------------------------------------------");
push("-- 2. Expansion SKU list (temp table used for delete-scoping below)");
push("-- ---------------------------------------------------------------------");
push("create temp table expansion_skus (sku text primary key);");
push("insert into expansion_skus (sku) values");
variantRows.forEach((v, i) => {
  push(`  ('${v.sku}')${i === variantRows.length - 1 ? "" : ","}`);
});
push(";");
push("");

// 3. Products
push("-- ---------------------------------------------------------------------");
push("-- 3. Products");
push("-- ---------------------------------------------------------------------");
push("insert into public.products (category_id, brand_id, name, slug, description, status, created_at)");
push("select");
push("  app.exp_category_id(v.category_slug),");
push("  case when v.brand_slug = '' then null else app.exp_brand_id(v.brand_slug) end,");
push("  v.name,");
push("  v.slug,");
push("  v.description,");
push("  'active'::public.product_status,");
push("  v.created_at");
push("from (values");
accepted.forEach((p, i) => {
  const brandSlug = p.brandSlug ?? "";
  push(`  ('${p.category}', '${brandSlug}', '${esc(p.name)}', '${p.slug}', '${esc(buildDescription(p))}', '${p.created_at}'::timestamptz)${i === accepted.length - 1 ? "" : ","}`);
});
push(") as v(category_slug, brand_slug, name, slug, description, created_at)");
push("on conflict (slug) do nothing;");
push("");

// 4. Variants
push("-- ---------------------------------------------------------------------");
push("-- 4. Product variants");
push("-- ---------------------------------------------------------------------");
push("insert into public.product_variants (product_id, name, sku, options, status)");
push("select");
push("  app.exp_product_id(v.product_slug),");
push("  v.name,");
push("  v.sku,");
push("  v.options::jsonb,");
push("  'active'::public.entity_status");
push("from (values");
variantRows.forEach((v, i) => {
  push(`  ('${v.productSlug}', '${esc(v.name)}', '${v.sku}', '${esc(JSON.stringify(v.options))}')${i === variantRows.length - 1 ? "" : ","}`);
});
push(") as v(product_slug, name, sku, options)");
push("on conflict (sku) do nothing;");
push("");

// 5. Delete-scope stale images/prices/inventory for expansion SKUs
push("-- ---------------------------------------------------------------------");
push("-- 5. Remove any previously-seeded expansion rows (idempotency)");
push("-- ---------------------------------------------------------------------");
push("delete from public.inventory_items");
push("where variant_id in (");
push("  select id from public.product_variants where sku in (select sku from expansion_skus)");
push(");");
push("");
push("delete from public.prices");
push("where variant_id in (");
push("  select id from public.product_variants where sku in (select sku from expansion_skus)");
push(");");
push("");
push("delete from public.product_images");
push("where product_id in (");
push("  select product_id from public.product_variants where sku in (select sku from expansion_skus)");
push(");");
push("");

// 6. Images
push("-- ---------------------------------------------------------------------");
push("-- 6. Product images (same-origin product SVGs)");
push("-- ---------------------------------------------------------------------");
push("insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)");
push("select");
push("  app.exp_product_id(v.product_slug),");
push("  v.url,");
push("  v.alt_text,");
push("  v.sort_order,");
push("  v.is_primary");
push("from (values");
imageRows.forEach((img, i) => {
  push(`  ('${img.productSlug}', '${img.url}', '${esc(img.alt)}', ${img.sortOrder}, ${img.isPrimary})${i === imageRows.length - 1 ? "" : ","}`);
});
push(") as v(product_slug, url, alt_text, sort_order, is_primary);");
push("");

// 7. Prices — selling
push("-- ---------------------------------------------------------------------");
push("-- 7. Selling prices (variant level)");
push("-- ---------------------------------------------------------------------");
push("insert into public.prices (product_id, variant_id, price_type, amount, valid_from, valid_to, created_by)");
push("select");
push("  null,");
push("  app.exp_variant_id(v.sku),");
push("  'selling'::public.price_type,");
push("  v.amount,");
push("  now() - interval '30 days',");
push("  null,");
push("  app.exp_owner_id()");
push("from (values");
priceRows.forEach((pr, i) => {
  push(`  ('${pr.productSlug}', '${pr.sku}', ${pr.amount.toFixed(2)})${i === priceRows.length - 1 ? "" : ","}`);
});
push(") as v(product_slug, sku, amount);");
push("");

// 8. Prices — sale
push("-- ---------------------------------------------------------------------");
push("-- 8. Sale prices (variant level, active 90 days)");
push("-- ---------------------------------------------------------------------");
push("insert into public.prices (product_id, variant_id, price_type, amount, valid_from, valid_to, created_by)");
push("select");
push("  null,");
push("  app.exp_variant_id(v.sku),");
push("  'sale'::public.price_type,");
push("  v.amount,");
push("  now() - interval '30 days',");
push("  now() + interval '90 days',");
push("  app.exp_owner_id()");
push("from (values");
saleRows.forEach((sr, i) => {
  push(`  ('${sr.productSlug}', '${sr.sku}', ${sr.amount.toFixed(2)})${i === saleRows.length - 1 ? "" : ","}`);
});
push(") as v(product_slug, sku, amount);");
push("");

// 9. Inventory
push("-- ---------------------------------------------------------------------");
push("-- 9. Inventory (ACCRA-STORE)");
push("-- ---------------------------------------------------------------------");
push("insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)");
push("select");
push("  app.exp_location_id(),");
push("  app.exp_variant_id(v.sku),");
push("  v.qty,");
push("  0,");
push("  v.cost,");
push("  6,");
push("  12");
push("from (values");
inventoryRows.forEach((iv, i) => {
  push(`  ('${iv.sku}', ${iv.qty}, ${iv.cost.toFixed(2)})${i === inventoryRows.length - 1 ? "" : ","}`);
});
push(") as v(sku, qty, cost);");
push("");

// 10. Cleanup
push("-- ---------------------------------------------------------------------");
push("-- 10. Drop temporary helpers");
push("-- ---------------------------------------------------------------------");
push("drop table if exists expansion_skus;");
push("drop function if exists app.exp_owner_id();");
push("drop function if exists app.exp_location_id();");
push("drop function if exists app.exp_category_id(text);");
push("drop function if exists app.exp_brand_id(text);");
push("drop function if exists app.exp_product_id(text);");
push("drop function if exists app.exp_variant_id(text);");
push("");

const outFile = `${root}/supabase/migrations/20260815000020_stage_17_catalogue_expansion.sql`;
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, lines.join("\n"));

// ---------------------------------------------------------------------------
// Image manifest (append-only — never removes existing entries)
// ---------------------------------------------------------------------------
const manifestFile = `${dataDir}/expansion-image-manifest.json`;
let manifest = { generatedAt: new Date().toISOString(), products: [] };
if (existsSync(manifestFile)) {
  try {
    manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  } catch {
    manifest = { generatedAt: new Date().toISOString(), products: [] };
  }
}
const manifestSlugs = new Set(manifest.products.map((m) => m.slug));
const manifestAdditions = accepted
  .filter((p) => !manifestSlugs.has(p.slug))
  .map((p) => ({
    slug: p.slug,
    name: p.name,
    dept: p.dept,
    brand: p.brandSlug ? (newBrands.get(p.brandSlug) ?? brandNameForLive(p.brandSlug)) : "",
  }));
manifest.generatedAt = new Date().toISOString();
manifest.products = [...manifest.products, ...manifestAdditions];
writeFileSync(manifestFile, JSON.stringify(manifest, null, 1));

// ---------------------------------------------------------------------------
// Batch report
// ---------------------------------------------------------------------------
const report = {
  generatedAt: new Date().toISOString(),
  sourceFiles: expansionFiles,
  candidates: rows.length,
  accepted: accepted.length,
  rejected: {
    duplicateAgainstLive: rejects.duplicateName.length,
    duplicateWithinBatch: rejects.duplicateNormalized.length,
    missingOrInvalidPrice: rejects.missingPrice.length,
    invalidCategory: rejects.invalidCategory.length,
    invalidBrand: rejects.invalidBrand.length,
    missingName: rejects.missingName.length,
    total: rejects.duplicateName.length + rejects.duplicateNormalized.length + rejects.missingPrice.length + rejects.invalidCategory.length + rejects.invalidBrand.length + rejects.missingName.length,
  },
  newBrands: brandRows.length,
  brandsReferenced: accepted.filter((p) => p.brandSlug).length,
  unbrandedProducts: accepted.filter((p) => !p.brandSlug).length,
  variants: variantRows.length,
  sellingRows: priceRows.length,
  saleRows: saleRows.length,
  saleProducts: new Set(saleRows.map((r) => r.productSlug)).size,
  inventoryRows: inventoryRows.length,
  categoriesUsed: new Set(accepted.map((p) => p.category)).size,
  images: imageRows.length,
  totalLiveAfter: 3173 + accepted.length,
  migrationFile: "supabase/migrations/20260815000020_stage_17_catalogue_expansion.sql",
  sizeMB: Number((lines.join("\n").length / 1048576).toFixed(2)),
};
writeFileSync(`${dataDir}/expansion-batch-report.json`, JSON.stringify(report, null, 2));

console.log("Generated:", outFile);
console.log(report);