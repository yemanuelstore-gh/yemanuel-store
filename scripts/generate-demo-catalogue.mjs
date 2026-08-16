// Demo catalogue generator.
// Reads the demo product/brand data files + placeholder image index and emits
// supabase/migrations/20260815000016_stage_13b_demo_catalogue.sql
//
// Demo product slugs are checked against the real catalogue seed
// (20260815000015_stage_13b_initial_catalogue_seed.sql) and renamed with a
// `-demo` suffix on any collision, so the demo migration can never attach
// variants/images/prices/inventory to a real product.
//
// The migration is deterministic and idempotent:
//   - brands/products/variants use ON CONFLICT DO NOTHING
//   - images/prices/inventory are delete-scoped by the demo SKU prefix
//     (YS-DEMO-2026%) then re-inserted
//   - prices.created_by resolves to the owner auth user (stage 13a)
//   - a single demo warehouse location is created if missing
//   - temporary app.demo_* lookup helpers are dropped at the end

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;

const [brandsMod, electronicsMod, fashionMod, cosmeticsMod, homeMod] =
  await Promise.all([
    import(`${root}/scripts/demo-brands.mjs`),
    import(`${root}/scripts/demo-electronics.mjs`),
    import(`${root}/scripts/demo-fashion.mjs`),
    import(`${root}/scripts/demo-cosmetics.mjs`),
    import(`${root}/scripts/demo-home.mjs`),
  ]);

const INDEX = JSON.parse(
  readFileSync(`${root}/public/images/products/INDEX.json`, "utf8"),
);

const DEPT_POOLS = {
  electronics: ["demo-electronics-1.svg", "demo-electronics-2.svg", "demo-electronics-3.svg", "demo-electronics-4.svg", "demo-electronics-5.svg"],
  fashion: ["demo-fashion-1.svg", "demo-fashion-2.svg", "demo-fashion-3.svg", "demo-fashion-4.svg", "demo-fashion-5.svg"],
  cosmetics: ["demo-cosmetics-1.svg", "demo-cosmetics-2.svg", "demo-cosmetics-3.svg", "demo-cosmetics-4.svg", "demo-cosmetics-5.svg"],
  home: ["demo-home-1.svg", "demo-home-2.svg", "demo-home-3.svg", "demo-home-4.svg", "demo-home-5.svg"],
  generic: ["demo-generic-1.svg", "demo-generic-2.svg", "demo-generic-3.svg", "demo-generic-4.svg"],
};
const FILE_POOL = Object.fromEntries(INDEX.files.map((f) => [f, f]));

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/’/g, "")
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function esc(value) {
  return String(value).replace(/'/g, "''");
}

function buildDescription(name, brandName) {
  return `${name} — ${brandName}. Genuine, quality-checked and ready for delivery across Ghana at Yemanuel Store.`;
}

function buildVariants(opts) {
  if (Array.isArray(opts.v) && opts.v.length > 0) {
    return opts.v.map((v) => ({
      name: v.n,
      options: v.o ?? {},
      delta: v.d ?? 0,
    }));
  }
  const out = [];
  for (const size of opts.sizes ?? []) {
    out.push({ name: String(size), options: { Size: String(size) }, delta: 0 });
  }
  for (const color of opts.colors ?? []) {
    out.push({ name: String(color), options: { Colour: String(color) }, delta: 0 });
  }
  for (const eu of opts.eu ?? []) {
    out.push({ name: `EU ${eu}`, options: { Size: `EU ${eu}` }, delta: 0 });
  }
  if (out.length === 0) {
    out.push({ name: "Default", options: {}, delta: 0 });
  }
  return out;
}

const DISCOUNT_POOL = [0.15, 0.2, 0.25, 0.3, 0.1, 0.35, 0.18, 0.22, 0.28, 0.12];

function saleAmount(opts, selling, productIndex) {
  let sale;
  if (typeof opts.sale === "number") {
    sale = opts.sale;
  } else {
    const discount = DISCOUNT_POOL[productIndex % DISCOUNT_POOL.length];
    sale = Math.round((selling * (1 - discount)) / 5) * 5;
  }
  if (sale >= selling) sale = Math.max(Math.round((selling * 0.8) / 5) * 5, 1);
  return Math.max(Math.round(sale * 100) / 100, 1);
}

function buildCatalogue() {
  const catalogue = [];
  const byDept = [
    ["electronics", electronicsMod.ELECTRONICS],
    ["fashion", fashionMod.FASHION],
    ["cosmetics", cosmeticsMod.COSMETICS],
    ["home", homeMod.HOME],
  ];
  for (const [dept, rows] of byDept) {
    for (const [categorySlug, brandSlug, name, price, opts = {}] of rows) {
      catalogue.push({ dept, categorySlug, brandSlug, name, price, opts });
    }
  }
  return catalogue;
}

const catalogue = buildCatalogue();
const brandByName = new Map(brandsMod.BRANDS.map((b) => [b[1], b[0]]));

// Real catalogue slugs from the initial catalogue seed (stage 13b, 00015).
// Demo slugs colliding with these are renamed below so the demo migration can
// never touch real products.
const realSeedFile = `${root}/supabase/migrations/20260815000015_stage_13b_initial_catalogue_seed.sql`;
const realSlugs = new Set();
try {
  const realSeed = readFileSync(realSeedFile, "utf8");
  for (const m of realSeed.matchAll(/from public\.products where slug = '([^']+)';/g)) {
    realSlugs.add(m[1]);
  }
} catch {
  console.warn(`WARNING: could not read ${realSeedFile}; skipping real-slug collision protection`);
}

// Assign slugs (dedupe collisions within the demo catalogue and avoid
// collisions with real catalogue slugs)
const usedSlugs = new Set();
const renamedFromReal = [];
for (const p of catalogue) {
  const base = slugify(p.name);
  let slug = base;
  let n = 1;
  while (usedSlugs.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  if (realSlugs.has(slug)) {
    let d = 1;
    let candidate = `${slug}-demo`;
    while (usedSlugs.has(candidate)) {
      d += 1;
      candidate = `${slug}-demo-${d}`;
    }
    renamedFromReal.push({ base, slug: candidate });
    slug = candidate;
  }
  usedSlugs.add(slug);
  p.slug = slug;
}
const uniqueSlugs = new Set(catalogue.map((p) => p.slug));
if (uniqueSlugs.size !== catalogue.length) {
  throw new Error("Duplicate product slugs generated");
}

// Assign SKUs, variants, prices, images, timestamps
let skuSeq = 0;
const variantRows = [];
const priceRows = [];
const saleRows = [];
const imageRows = [];
const inventoryRows = [];

catalogue.forEach((p, index) => {
  const variants = buildVariants(p.opts);
  const selling = p.price;
  const createdDaysAgo = p.opts.new
    ? (index * 7) % 10
    : 30 + ((index * 37) % 360);
  const createdAt = new Date(
    Date.UTC(2026, 7, 1) - createdDaysAgo * 86400000,
  ).toISOString();
  p.created_at = createdAt;

  const pool = DEPT_POOLS[p.dept] ?? DEPT_POOLS.generic;

  variants.forEach((v, vi) => {
    skuSeq += 1;
    const sku = `YS-DEMO-2026-${String(skuSeq).padStart(6, "0")}`;
    v.sku = sku;
    v.productSlug = p.slug;
    const amount = Math.max(selling + v.delta, 1);
    v.selling = Math.round(amount * 100) / 100;
    v.sale = null;
    if (p.opts.sale) {
      const base = saleAmount(p.opts, selling, index);
      const sale = Math.max(selling + v.delta - (selling - base), 1);
      v.sale = sale < v.selling ? Math.round(sale * 100) / 100 : null;
    }
    variantRows.push({ productSlug: p.slug, name: v.name, sku, options: v.options });
    priceRows.push({ productSlug: p.slug, sku, amount: v.selling });
    if (v.sale !== null) {
      saleRows.push({ productSlug: p.slug, sku, amount: v.sale });
    }
    const qty = 8 + ((index * 13 + vi * 7) % 52);
    const cost = Math.round((v.selling * 0.62) * 100) / 100;
    inventoryRows.push({ sku, qty, cost, reorderLevel: 6, reorderQty: 12 });
  });

  // Images: primary + extras (product-level, variant_id null)
  const extraCount = index % 4 === 0 ? 2 : 0;
  const totalImages = 3 + extraCount;
  for (let i = 0; i < totalImages; i++) {
    const file = pool[i % pool.length];
    imageRows.push({
      productSlug: p.slug,
      url: `/images/products/${FILE_POOL[file] ?? file}`,
      alt: `${p.name} — view ${i + 1}`,
      sortOrder: i,
      isPrimary: i === 0,
    });
  }
});

// Build SQL
const lines = [];
const push = (s = "") => lines.push(s);

push("-- Stage 13b: seed the demo storefront catalogue.");
push("--");
push("-- Deterministic, idempotent demo data for the customer storefront:");
push(`--   ${catalogue.length} products, ${brandsMod.BRANDS.length} brands,`);
push(`--   ${variantRows.length} variants, ${imageRows.length} image rows,`);
push(`--   ${priceRows.length + saleRows.length} price rows, ${inventoryRows.length} inventory rows.`);
push("--");
push("-- Idempotency: brands/products/variants use ON CONFLICT DO NOTHING.");
push("-- Images, prices and inventory are deleted (scoped to the demo SKU");
push("-- prefix YS-DEMO-2026%) and re-inserted, so re-running converges.");
push("-- prices.created_by resolves to the stage 13a owner auth user.");
push("-- A single demo warehouse location is created if missing.");
push("--");
push("-- No schema changes and no category-tree changes are made here.");
push("");
push("set search_path = public, extensions;");
push("");

// Helpers
push("-- ---------------------------------------------------------------------");
push("-- Temporary lookup helpers (dropped at the end of this migration)");
push("-- ---------------------------------------------------------------------");
push("create or replace function app.demo_owner_id()");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from auth.users where email = 'owner@yemanuelstore.com' limit 1;");
push("$$;");
push("");
push("create or replace function app.demo_location_id()");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.locations where code = 'YS-DEMO-2026-ACC' limit 1;");
push("$$;");
push("");
push("create or replace function app.demo_category_id(p_slug text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.categories where slug = p_slug limit 1;");
push("$$;");
push("");
push("create or replace function app.demo_brand_id(p_slug text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.brands where slug = p_slug limit 1;");
push("$$;");
push("");
push("create or replace function app.demo_product_id(p_slug text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.products where slug = p_slug limit 1;");
push("$$;");
push("");
push("create or replace function app.demo_variant_id(p_sku text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.product_variants where sku = p_sku limit 1;");
push("$$;");
push("");

// 1. Demo location
push("-- ---------------------------------------------------------------------");
push("-- 1. Demo warehouse location (idempotent)");
push("-- ---------------------------------------------------------------------");
push("insert into public.locations (code, name, location_type, region_id, city, address_line_1, address_line_2, phone, status)");
push("select");
push("  'YS-DEMO-2026-ACC',");
push("  'Accra Demo Warehouse',");
push("  'warehouse'::public.location_type,");
push("  r.id,");
push("  'Accra',");
push("  'Demo Distribution Hub, Tema Motorway',");
push("  'Km 12, Spintex Road',");
push("  '+233 24 000 0000',");
push("  'active'::public.entity_status");
push("from public.regions r");
push("where r.code = 'ACC'");
push("on conflict (code) do nothing;");
push("");

// 2. Brands
push("-- ---------------------------------------------------------------------");
push("-- 2. Brands");
push("-- ---------------------------------------------------------------------");
push("insert into public.brands (name, slug, description, status)");
push("select v.name, v.slug, v.description, 'active'::public.entity_status");
push("from (values");
brandsMod.BRANDS.forEach(([name, slug, desc], i) => {
  push(`  ('${esc(name)}', '${slug}', '${esc(desc)}')${i === brandsMod.BRANDS.length - 1 ? "" : ","}`);
});
push(") as v(name, slug, description)");
push("on conflict (slug) do nothing;");
push("");

// 3. Delete existing demo catalogue rows
push("-- ---------------------------------------------------------------------");
push("-- 3. Remove any previously-seeded demo catalogue rows (idempotency)");
push("-- ---------------------------------------------------------------------");
push("delete from public.inventory_items");
push("where variant_id in (");
push("  select id from public.product_variants where sku like 'YS-DEMO-2026%'");
push(");");
push("");
push("delete from public.products");
push("where id in (");
push("  select product_id from public.product_variants where sku like 'YS-DEMO-2026%'");
push(");");
push("");

// 4. Products
push("-- ---------------------------------------------------------------------");
push("-- 4. Products");
push("-- ---------------------------------------------------------------------");
push("insert into public.products (category_id, brand_id, name, slug, description, status, created_at)");
push("select");
push("  app.demo_category_id(v.category_slug),");
push("  app.demo_brand_id(v.brand_slug),");
push("  v.name,");
push("  v.slug,");
push("  v.description,");
push("  'active'::public.product_status,");
push("  v.created_at");
push("from (values");
catalogue.forEach((p, i) => {
  const desc = p.opts.desc ?? buildDescription(p.name, brandByName.get(p.brandSlug) ?? p.brandSlug);
  push(`  ('${p.categorySlug}', '${p.brandSlug}', '${esc(p.name)}', '${p.slug}', '${esc(desc)}', '${p.created_at}'::timestamptz)${i === catalogue.length - 1 ? "" : ","}`);
});
push(") as v(category_slug, brand_slug, name, slug, description, created_at)");
push("on conflict (slug) do nothing;");
push("");

// 5. Variants
push("-- ---------------------------------------------------------------------");
push("-- 5. Product variants");
push("-- ---------------------------------------------------------------------");
push("insert into public.product_variants (product_id, name, sku, options, status)");
push("select");
push("  app.demo_product_id(v.product_slug),");
push("  v.name,");
push("  v.sku,");
push("  v.options::jsonb,");
push("  'active'::public.entity_status");
push("from (values");
variantRows.forEach((v, i) => {
  push(`  ('${v.productSlug}', '${esc(v.name)}', '${v.sku}', '${JSON.stringify(v.options)}')${i === variantRows.length - 1 ? "" : ","}`);
});
push(") as v(product_slug, name, sku, options)");
push("on conflict (sku) do nothing;");
push("");

// 6. Images
push("-- ---------------------------------------------------------------------");
push("-- 6. Product images (same-origin placeholder SVGs)");
push("-- ---------------------------------------------------------------------");
push("insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)");
push("select");
push("  app.demo_product_id(v.product_slug),");
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
push("  app.demo_variant_id(v.sku),");
push("  'selling'::public.price_type,");
push("  v.amount,");
push("  now() - interval '30 days',");
push("  null,");
push("  app.demo_owner_id()");
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
push("  app.demo_variant_id(v.sku),");
push("  'sale'::public.price_type,");
push("  v.amount,");
push("  now() - interval '30 days',");
push("  now() + interval '90 days',");
push("  app.demo_owner_id()");
push("from (values");
saleRows.forEach((sr, i) => {
  push(`  ('${sr.productSlug}', '${sr.sku}', ${sr.amount.toFixed(2)})${i === saleRows.length - 1 ? "" : ","}`);
});
push(") as v(product_slug, sku, amount);");
push("");

// 9. Inventory
push("-- ---------------------------------------------------------------------");
push("-- 9. Inventory (demo warehouse)");
push("-- ---------------------------------------------------------------------");
push("insert into public.inventory_items (location_id, variant_id, quantity_on_hand, reserved_quantity, average_cost, reorder_level, reorder_quantity)");
push("select");
push("  app.demo_location_id(),");
push("  app.demo_variant_id(v.sku),");
push("  v.qty,");
push("  0,");
push("  v.cost,");
push("  v.reorder_level,");
push("  v.reorder_quantity");
push("from (values");
inventoryRows.forEach((iv, i) => {
  push(`  ('${iv.sku}', ${iv.qty}, ${iv.cost.toFixed(2)}, ${iv.reorderLevel}, ${iv.reorderQty})${i === inventoryRows.length - 1 ? "" : ","}`);
});
push(") as v(sku, qty, cost, reorder_level, reorder_quantity);");
push("");

// 10. Drop helpers
push("-- ---------------------------------------------------------------------");
push("-- 10. Drop temporary helpers");
push("-- ---------------------------------------------------------------------");
push("drop function if exists app.demo_owner_id();");
push("drop function if exists app.demo_location_id();");
push("drop function if exists app.demo_category_id(text);");
push("drop function if exists app.demo_brand_id(text);");
push("drop function if exists app.demo_product_id(text);");
push("drop function if exists app.demo_variant_id(text);");
push("");

const outFile = `${root}/supabase/migrations/20260815000016_stage_13b_demo_catalogue.sql`;
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, lines.join("\n"));

// Report
const saleProducts = new Set(
  catalogue.filter((p) => p.opts.sale).map((p) => p.slug),
).size;
const newProducts = catalogue.filter((p) => p.opts.new).length;
console.log("Generated:", outFile);
console.log({
  products: catalogue.length,
  brands: brandsMod.BRANDS.length,
  variants: variantRows.length,
  imageRows: imageRows.length,
  sellingRows: priceRows.length,
  saleRows: saleRows.length,
  inventoryRows: inventoryRows.length,
  saleProducts,
  newProducts,
  categoriesUsed: new Set(catalogue.map((p) => p.categorySlug)).size,
});
if (renamedFromReal.length > 0) {
  console.log("Renamed to avoid real-catalogue slug collisions:");
  for (const r of renamedFromReal) console.log(`  ${r.base} -> ${r.slug}`);
}
