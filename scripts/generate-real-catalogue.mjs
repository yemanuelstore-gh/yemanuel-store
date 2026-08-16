// Real catalogue generator.
// Reads the research-backed product JSONs (scripts/catalogue-data/*.json),
// the live category tree snapshot (categories.json), the protected real-catalogue
// slugs (protected-products.json) and the live SKU list (live_skus.txt) and
// emits supabase/migrations/20260815000017_stage_14_real_catalogue.sql.
//
// The migration is deterministic and idempotent:
//   - brands/products/variants use ON CONFLICT DO NOTHING
//   - images/prices/inventory are delete-scoped by the catalogue SKU list
//     (temp table) then re-inserted
//   - prices.created_by resolves to the owner auth user (stage 13a)
//   - inventory lands at the ACCRA-STORE location
//   - temporary app.real_* lookup helpers are dropped at the end
//
// Nothing in this migration modifies the 144 protected real products, the
// category tree, locations, orders, customers or auth users.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;
const dataDir = `${root}/scripts/catalogue-data`;

const DEPTS = ["mobile", "electronics", "fashion", "cosmetics", "home", "gaming"];

const catalogue = [];
const brandNames = new Map();

for (const dept of DEPTS) {
  const data = JSON.parse(readFileSync(`${dataDir}/${dept}.json`, "utf8"));
  for (const p of data.products) {
    const brand = String(p.brand ?? "").trim();
    const brandSlug = brand === "" || brand.toLowerCase() === "generic" ? null : slugify(brand);
    if (brandSlug) brandNames.set(brandSlug, brand);
    catalogue.push({
      dept,
      categorySlug: p.category,
      brandSlug,
      name: String(p.name ?? "").trim(),
      price: Number(p.price),
      sale: p.sale === null || p.sale === undefined ? null : Number(p.sale),
      variants: Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : [{ name: "Default", delta: 0 }],
      specs: Array.isArray(p.specs) ? p.specs.map((s) => String(s)) : [],
    });
  }
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’'&]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function esc(value) {
  return String(value).replace(/'/g, "''");
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Slug assignment: internal uniqueness + no collision with the 144 protected
// products.
// ---------------------------------------------------------------------------
const protectedSlugs = new Set(JSON.parse(readFileSync(`${dataDir}/protected-products.json`, "utf8")));
const usedSlugs = new Set();
for (const p of catalogue) {
  const base = slugify(p.name);
  let slug = base;
  let n = 1;
  while (usedSlugs.has(slug) || protectedSlugs.has(slug)) {
    n += 1;
    slug = `${base}-${n}`;
  }
  usedSlugs.add(slug);
  p.slug = slug;
}
if (new Set(catalogue.map((p) => p.slug)).size !== catalogue.length) {
  throw new Error("Duplicate product slugs generated");
}

// ---------------------------------------------------------------------------
// SKU assignment: <BRANDCODE>-<NNNN>-<VARIANT INDEX> with a live-SKU guard.
// ---------------------------------------------------------------------------
const liveSkus = new Set(
  readFileSync(`${dataDir}/live_skus.txt`, "utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean),
);
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

catalogue.forEach((p, index) => {
  const code = brandCode(p.brandSlug);
  const seq = (brandCounters.get(code) ?? 1000) + 1;
  brandCounters.set(code, seq);
  const skuBase = `${code}-${String(seq).padStart(4, "0")}`;

  const createdDaysAgo = 20 + ((index * 37) % 340);
  p.created_at = new Date(Date.UTC(2026, 7, 1) - createdDaysAgo * 86400000).toISOString();

  p.variants.forEach((v, vi) => {
    let sku = `${skuBase}-${vi + 1}`;
    let bump = 1;
    while (liveSkus.has(sku)) {
      bump += 1;
      sku = `${skuBase}-${vi + 1}-${bump}`;
    }
    const selling = round2(Math.max(p.price + Number(v.delta ?? 0), 1));
    let sale = null;
    if (p.sale !== null) {
      const candidate = round2(Math.max(p.sale + Number(v.delta ?? 0), 1));
      if (candidate < selling) sale = candidate;
    }
    variantRows.push({ productSlug: p.slug, name: String(v.name ?? "Default"), sku, options: inferOptions(v.name) });
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

function inferOptions(name) {
  const n = String(name ?? "");
  if (/^\d+(\.\d+)?\s?(gb|tb|mb)$/i.test(n)) return { Capacity: n.toUpperCase() };
  if (/^\d+(\.\d+)?\s?(ml|l|kg|g|cl|oz|pcs|pc|cm|inch)$/i.test(n)) return { Size: n };
  if (/^(xs|s|m|l|xl|xxl|xxxl|eu\s?\d+(\.\d+)?|uk\s?\d+(\.\d+)?|\d+(\.\d+)?)$/i.test(n)) return { Size: n };
  if (/(black|white|blue|red|green|gold|silver|navy|grey|gray|brown|pink|purple|orange|yellow|tan|beige|cream|maroon|wine|olive|khaki|charcoal|rose|teal)/i.test(n)) return { Colour: n };
  return { Variant: n };
}

function buildDescription(p) {
  const brand = p.brandSlug ? brandNames.get(p.brandSlug) ?? "" : "";
  const specs = p.specs.slice(0, 3).join(" · ");
  const lead = brand ? `${p.name} — ${brand}.` : `${p.name}.`;
  const middle = specs ? ` ${specs}.` : "";
  return `${lead}${middle} Genuine, quality-checked and ready for delivery across Ghana at Yemanuel Store.`;
}

function buildBrandDescription(name) {
  return `${name} — quality-checked products available at Yemanuel Store in Ghana.`;
}

// ---------------------------------------------------------------------------
// Emit SQL
// ---------------------------------------------------------------------------
const lines = [];
const push = (s = "") => lines.push(s);

const brandRows = [...brandNames.entries()]
  .map(([slug, name]) => ({ slug, name }))
  .sort((a, b) => a.slug.localeCompare(b.slug));

push("-- Stage 14: research-backed retail catalogue.");
push("--");
push("-- Adds the full Ghana-market catalogue researched from Ghanaian retail");
push("-- sources (Jumia GH, Melcom, Superprice, CompuGhana, Telefonika and");
push("-- others). Priced in GHS from observed market prices.");
push(`--   ${catalogue.length} products, ${brandRows.length} brands,`);
push(`--   ${variantRows.length} variants, ${imageRows.length} image rows,`);
push(`--   ${priceRows.length} selling + ${saleRows.length} sale price rows,`);
push(`--   ${inventoryRows.length} inventory rows (ACCRA-STORE).`);
push("--");
push("-- Idempotency: brands/products/variants use ON CONFLICT DO NOTHING.");
push("-- Images, prices and inventory are delete-scoped by the catalogue SKU");
push("-- list (temp table) and re-inserted, so re-running converges.");
push("-- prices.created_by resolves to the stage 13a owner auth user.");
push("-- The 144 protected real products, category tree, locations, orders,");
push("-- customers and auth users are never touched.");
push("--");
push("-- No schema changes are made here.");
push("");
push("set search_path = public, extensions;");
push("");

// Helpers
push("-- ---------------------------------------------------------------------");
push("-- Temporary lookup helpers (dropped at the end of this migration)");
push("-- ---------------------------------------------------------------------");
push("create or replace function app.real_owner_id()");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from auth.users where email = 'owner@yemanuelstore.com' limit 1;");
push("$$;");
push("");
push("create or replace function app.real_location_id()");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.locations where code = 'ACCRA-STORE' limit 1;");
push("$$;");
push("");
push("create or replace function app.real_category_id(p_slug text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.categories where slug = p_slug limit 1;");
push("$$;");
push("");
push("create or replace function app.real_brand_id(p_slug text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.brands where slug = p_slug limit 1;");
push("$$;");
push("");
push("create or replace function app.real_product_id(p_slug text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.products where slug = p_slug limit 1;");
push("$$;");
push("");
push("create or replace function app.real_variant_id(p_sku text)");
push("returns uuid");
push("language sql stable");
push("as $$");
push("  select id from public.product_variants where sku = p_sku limit 1;");
push("$$;");
push("");

// 1. Brands
push("-- ---------------------------------------------------------------------");
push("-- 1. Brands");
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

// 2. Catalogue SKU list (temp table)
push("-- ---------------------------------------------------------------------");
push("-- 2. Catalogue SKU list (temp table used for delete-scoping below)");
push("-- ---------------------------------------------------------------------");
push("create temp table catalogue_skus (sku text primary key);");
push("insert into catalogue_skus (sku) values");
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
push("  app.real_category_id(v.category_slug),");
push("  app.real_brand_id(v.brand_slug),");
push("  v.name,");
push("  v.slug,");
push("  v.description,");
push("  'active'::public.product_status,");
push("  v.created_at");
push("from (values");
catalogue.forEach((p, i) => {
  const brandSlug = p.brandSlug ?? "";
  push(`  ('${p.categorySlug}', '${brandSlug}', '${esc(p.name)}', '${p.slug}', '${esc(buildDescription(p))}', '${p.created_at}'::timestamptz)${i === catalogue.length - 1 ? "" : ","}`);
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
push("  app.real_product_id(v.product_slug),");
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

// 5. Delete-scope stale images/prices/inventory for catalogue SKUs
push("-- ---------------------------------------------------------------------");
push("-- 5. Remove any previously-seeded catalogue rows (idempotency)");
push("-- ---------------------------------------------------------------------");
push("delete from public.inventory_items");
push("where variant_id in (");
push("  select id from public.product_variants where sku in (select sku from catalogue_skus)");
push(");");
push("");
push("delete from public.prices");
push("where variant_id in (");
push("  select id from public.product_variants where sku in (select sku from catalogue_skus)");
push(");");
push("");
push("delete from public.product_images");
push("where product_id in (");
push("  select product_id from public.product_variants where sku in (select sku from catalogue_skus)");
push(");");
push("");

// 6. Images
push("-- ---------------------------------------------------------------------");
push("-- 6. Product images (same-origin product SVGs)");
push("-- ---------------------------------------------------------------------");
push("insert into public.product_images (product_id, url, alt_text, sort_order, is_primary)");
push("select");
push("  app.real_product_id(v.product_slug),");
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
push("  app.real_variant_id(v.sku),");
push("  'selling'::public.price_type,");
push("  v.amount,");
push("  now() - interval '30 days',");
push("  null,");
push("  app.real_owner_id()");
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
push("  app.real_variant_id(v.sku),");
push("  'sale'::public.price_type,");
push("  v.amount,");
push("  now() - interval '30 days',");
push("  now() + interval '90 days',");
push("  app.real_owner_id()");
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
push("  app.real_location_id(),");
push("  app.real_variant_id(v.sku),");
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
push("drop table if exists catalogue_skus;");
push("drop function if exists app.real_owner_id();");
push("drop function if exists app.real_location_id();");
push("drop function if exists app.real_category_id(text);");
push("drop function if exists app.real_brand_id(text);");
push("drop function if exists app.real_product_id(text);");
push("drop function if exists app.real_variant_id(text);");
push("");

const outFile = `${root}/supabase/migrations/20260815000017_stage_14_real_catalogue.sql`;
mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, lines.join("\n"));

// Image manifest for the SVG generator
writeFileSync(
  `${dataDir}/image-manifest.json`,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      products: catalogue.map((p) => ({ slug: p.slug, name: p.name, dept: p.dept, brand: p.brandSlug ? brandNames.get(p.brandSlug) : "" })),
    },
    null,
    1,
  ),
);

const saleProducts = new Set(saleRows.map((r) => r.productSlug)).size;
console.log("Generated:", outFile);
console.log({
  products: catalogue.length,
  brands: brandRows.length,
  variants: variantRows.length,
  imageRows: imageRows.length,
  sellingRows: priceRows.length,
  saleRows: saleRows.length,
  saleProducts,
  inventoryRows: inventoryRows.length,
  categoriesUsed: new Set(catalogue.map((p) => p.categorySlug)).size,
  sizeMB: Number((lines.join("\n").length / 1048576).toFixed(2)),
});