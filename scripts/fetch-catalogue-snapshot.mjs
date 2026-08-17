// Read-only catalogue snapshot for the product image audit.
//
// Pulls the live catalogue from Supabase via the REST API (service role) and
// writes scripts/product-images/catalogue-snapshot.json. No writes are made.
//
// Snapshot contents:
//   - products: id, name, slug, status, category (name/slug), brand (name)
//   - images:   product_id, url, alt_text, is_primary, sort_order
//
// Run: node scripts/fetch-catalogue-snapshot.mjs

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;
const outDir = `${root}/scripts/product-images`;

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
      const text = await res.text();
      throw new Error(`GET ${path} failed (${res.status}): ${text.slice(0, 500)}`);
    }
    const page = await res.json();
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return rows;
}

async function main() {
  console.log("Fetching products…");
  const products = await fetchAll(
    "products",
    "id,name,slug,status,categories(name,slug),brands(name)",
  );
  console.log(`  ${products.length} products`);

  console.log("Fetching product_images…");
  const images = await fetchAll(
    "product_images",
    "product_id,url,alt_text,is_primary,sort_order",
  );
  console.log(`  ${images.length} product images`);

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const snapshot = {
    fetchedAt: new Date().toISOString(),
    products,
    images,
  };
  writeFileSync(`${outDir}/catalogue-snapshot.json`, JSON.stringify(snapshot, null, 2));
  console.log(`Wrote ${outDir}/catalogue-snapshot.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});