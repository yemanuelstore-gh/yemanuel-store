// Pexels product photo fetcher.
//
// Queries the Pexels search API once per product and records the best matching
// photo in scripts/catalogue-data/pexels-map.json. The map is written to disk
// after every single fetch, so the script is crash-safe and resumable: slugs
// already in the map are never re-queried.
//
// Requires PEXELS_API_KEY in the environment (free at https://www.pexels.com/api).
//
// Usage:
//   PEXELS_API_KEY=... node scripts/fetch-pexels-images.mjs            # everything
//   PEXELS_API_KEY=... node scripts/fetch-pexels-images.mjs --live     # main catalogue only
//   PEXELS_API_KEY=... node scripts/fetch-pexels-images.mjs --limit 200
//   PEXELS_API_KEY=... node scripts/fetch-pexels-images.mjs --retry-failed
//   PEXELS_API_KEY=... node scripts/fetch-pexels-images.mjs --slugs slug1,slug2
//
// The Pexels free tier allows 200 requests/hour. The script pauses when the
// limit is reached and resumes when the window resets, so a full run simply
// takes several hours — run it in the background and re-run it later.

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;
const dataDir = `${root}/scripts/catalogue-data`;
const mapFile = join(dataDir, "pexels-map.json");

const API_KEY = process.env.PEXELS_API_KEY;
if (!API_KEY) {
  console.error("Missing PEXELS_API_KEY environment variable.");
  process.exit(1);
}

const args = process.argv.slice(2);
const liveOnly = args.includes("--live");
const retryFailed = args.includes("--retry-failed");
const limitArg = args.find((a) => a.startsWith("--limit")) ?? null;
const limit = limitArg ? Number((limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1] ?? 0)) : Infinity;
const slugsArg = args.find((a) => a.startsWith("--slugs")) ?? null;
const slugsToRefresh = slugsArg
  ? String(slugsArg.split("=")[1] ?? args[args.indexOf(slugsArg) + 1] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  : null;

const manifest = JSON.parse(
  readFileSync(join(dataDir, liveOnly ? "image-manifest.json" : "expansion-image-manifest.json"), "utf8"),
);

// First batch is the main catalogue, then the expansion catalogue.
let products;
if (liveOnly) {
  products = manifest.products;
} else {
  const main = JSON.parse(readFileSync(join(dataDir, "image-manifest.json"), "utf8"));
  const expansion = JSON.parse(readFileSync(join(dataDir, "expansion-image-manifest.json"), "utf8"));
  products = [...main.products, ...expansion.products];
}

const SPEC_TOKEN =
  /\b(\d+(?:\.\d+)?\s?(?:gb|tb|mb|mah|ah|watts?|lit(?:re|er)s?))\b|\b(\d+(?:\.\d+)?(?:-inch|"| inch| inches))\b|(\d+(?:\.\d+)?(?:ml|g|kg|cm|mm|m|w|v)\b)/gi;

const FILLER_TOKEN =
  /\b(ram|rom|dual sim|single sim|sim free|unlocked|wifi|wi-fi|bluetooth|refurbished|uk used|pre-owned|brand new|new)\b|\b(?:19|20)\d{2}\b/gi;

const TYPE_HINTS = {
  mobile: ["smartphone", "tablet", "smartwatch", "earbuds", "headphones", "phone case", "power bank", "charger", "cable", "car mount", "screen protector"],
  electronics: ["tv", "laptop", "monitor", "camera", "keyboard", "headphones", "speaker", "soundbar", "receiver", "turntable", "amplifier", "printer", "projector", "router", "drone", "scanner", "hard drive", "ssd", "memory card", "webcam", "microphone", "cable", "charger", "adapter", "surge protector", "battery"],
  fashion: ["shirt", "dress", "sneakers", "shoes", "sandals", "jeans", "trousers", "jacket", "belt", "watch", "bag", "sunglasses", "cap", "socks", "underwear", "pajamas", "suit", "gown", "kaftan", "heels", "loafers", "boots", "shorts", "hoodie", "scarf", "jewelry", "earrings", "necklace", "bracelet"],
  cosmetics: ["perfume", "cologne", "soap", "shampoo", "conditioner", "lotion", "cream", "oil", "wig", "makeup", "lipstick", "foundation", "eyeliner", "mascara", "toothpaste", "razor", "gel", "spray", "mask", "serum", "scrub", "deodorant", "body wash", "moisturizer", "sunscreen", "nail polish", "hair dryer", "flat iron", "comb", "brush"],
  home: ["sofa", "chair", "table", "bed", "mattress", "fridge", "freezer", "microwave", "blender", "kettle", "iron", "toaster", "fan", "air conditioner", "washer", "vacuum", "lamp", "rug", "curtain", "cookware", "pot", "pan", "utensils", "storage", "bin", "clock", "pillow", "blanket", "water filter", "purifier", "humidifier", "heater", "sewing machine", "generator", "solar", "cooker", "oven", "grill", "food processor", "juicer", "coffee maker"],
  gaming: ["gamepad", "controller", "headset", "console", "keyboard", "mouse", "mouse pad", "chair", "desk", "monitor", "gaming chair"],
};

function cleanQuery(name) {
  return String(name)
    .replace(SPEC_TOKEN, " ")
    .replace(FILLER_TOKEN, " ")
    .replace(/["“”]/g, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ALL_HINTS = Object.values(TYPE_HINTS).flat();

function buildQuery(p) {
  let q = cleanQuery(p.name);
  const lower = q.toLowerCase();
  const nameWords = new Set(lower.split(/\s+/).filter((w) => w.length >= 3));
  const hints = TYPE_HINTS[p.dept] ?? [];
  const hasTypeWord = ALL_HINTS.some((h) => lower.includes(h));
  let hint = "";
  if (!hasTypeWord && hints.length > 0) {
    let bestHint = hints[0];
    let bestOverlap = 0;
    for (const h of hints) {
      const overlap = h.split(" ").filter((w) => nameWords.has(w)).length;
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestHint = h;
      }
    }
    hint = bestHint;
  }
  const words = q.split(" ").filter(Boolean);
  const hintCount = hint ? hint.split(" ").length : 0;
  const base = words.slice(0, 8 - hintCount).join(" ");
  return base ? `${base} ${hint}`.trim() : hint;
}

const QUERY_TOKENS = (query) => query.split(" ").filter((w) => w.length >= 3);

const HINT_WORDS = new Set(ALL_HINTS.flatMap((h) => h.split(" ")));

// A single matched token is only trusted when it is a product-type word.
// These words are too generic to trust alone (a "master" watch photo, a
// "canon" camera photo, a "case" for diecast cars, etc.).
const GENERIC_WORDS = new Set([
  "case", "kit", "holder", "stand", "pad", "pen", "cable", "cap", "watch",
  "smart", "digital", "display", "photo", "desk", "wall", "glass", "screen",
  "protector", "adapter", "cleaner", "oil", "gel", "mask", "spray", "comb",
  "brush", "bag", "belt", "sock", "master", "series", "edition", "plus",
  "pro", "ultra", "max", "mini", "lite", "air", "edge", "note", "flip",
  "fold", "one", "two", "new", "set", "top", "best", "black", "white",
]);

function isGoodMatch(photo, tokens) {
  const altWords = new Set(
    (photo.alt ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
  );
  const matched = tokens.filter((t) => altWords.has(t));
  if (matched.length >= 2) return true;
  if (matched.length === 1) {
    const token = matched[0];
    return HINT_WORDS.has(token) && !GENERIC_WORDS.has(token);
  }
  return false;
}

function pickBest(photos, query) {
  const tokens = QUERY_TOKENS(query.toLowerCase());
  let best = photos[0];
  let bestScore = -1;
  for (const photo of photos) {
    const s = scorePhoto(photo, tokens);
    if (s > bestScore) {
      best = photo;
      bestScore = s;
    }
  }
  return best;
}

function scorePhoto(photo, queryTokens) {
  const altWords = new Set(
    (photo.alt ?? "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
  );
  let score = 0;
  for (const token of queryTokens) {
    if (altWords.has(token)) score += 1;
  }
  return score;
}

function squareUrl(photo) {
  const base = photo.src.original.split("?")[0];
  return `${base}?auto=compress&cs=tinysrgb&w=1200&h=1200&fit=crop`;
}

function loadMap() {
  if (existsSync(mapFile)) {
    try {
      return JSON.parse(readFileSync(mapFile, "utf8"));
    } catch {
      return { generatedAt: null, products: {} };
    }
  }
  return { generatedAt: null, products: {} };
}

const map = loadMap();
const known = new Set(Object.keys(map.products));
const failed = map.failed ?? [];

let toFetch = products.filter((p) => {
  if (slugsToRefresh) return slugsToRefresh.includes(p.slug);
  if (known.has(p.slug)) return false;
  if (!retryFailed && failed.includes(p.slug)) return false;
  if (retryFailed && !failed.includes(p.slug)) return false;
  return true;
});

if (retryFailed) {
  const failedSet = new Set(failed);
  toFetch = products.filter((p) => failedSet.has(p.slug));
}

console.log(`Map already has ${known.size} products; ${toFetch.length} to fetch`);

let fetched = 0;
const requestTimes = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRateLimit() {
  const windowMs = 60 * 60 * 1000;
  const cutoff = Date.now() - windowMs;
  const recent = requestTimes.filter((t) => t > cutoff);
  if (recent.length >= 195) {
    const oldest = recent[0];
    const wait = windowMs - (Date.now() - oldest) + 15_000;
    console.log(`Rate limit nearing (${recent.length}/200 this hour); sleeping ${Math.ceil(wait / 60000)} min...`);
    await sleep(wait);
  }
}

async function fetchPhoto(p) {
  const query = buildQuery(p);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=square`;
    const started = Date.now();
    let res;
    try {
      res = await fetch(url, { headers: { Authorization: API_KEY } });
    } catch (err) {
      console.error(`  network error for ${p.slug}: ${err.message}`);
      await sleep(10_000 * (attempt + 1));
      continue;
    }
    requestTimes.push(started);
    if (res.status === 429) {
      await sleep(90_000);
      continue;
    }
    if (!res.ok) {
      console.error(`  HTTP ${res.status} for ${p.slug} ("${query}")`);
      return { error: `HTTP ${res.status}` };
    }
    const data = await res.json();
    if (!data.photos || data.photos.length === 0) {
      return { error: "no-results" };
    }
    const photo = pickBest(data.photos, query);
    const tokens = QUERY_TOKENS(query.toLowerCase());
    if (!isGoodMatch(photo, tokens)) {
      return { error: "no-good-match" };
    }
    return {
      url: squareUrl(photo),
      alt: photo.alt ?? query,
      photographer: photo.photographer ?? null,
      photographerUrl: photo.photographer_url ?? null,
      query,
    };
  }
  return { error: "rate-limited" };
}

for (const p of toFetch) {
  if (fetched >= limit) break;
  await waitForRateLimit();

  const result = await fetchPhoto(p);
  if (result.error === "no-good-match") {
    map.products[p.slug] = {
      name: p.name,
      dept: p.dept,
      brand: p.brand ?? null,
      query: buildQuery(p),
      error: "no-good-match",
    };
    process.stdout.write("~");
  } else if (result.error) {
    if (!map.failed) map.failed = [];
    if (!map.failed.includes(p.slug)) map.failed.push(p.slug);
    process.stdout.write("x");
  } else {
    map.products[p.slug] = {
      name: p.name,
      dept: p.dept,
      brand: p.brand ?? null,
      ...result,
    };
    process.stdout.write(".");
  }
  fetched += 1;
  if (fetched % 20 === 0) {
    writeMap();
    console.log(` ${fetched}/${toFetch.length}`);
  }
}

function writeMap() {
  if (!map.generatedAt) map.generatedAt = new Date().toISOString();
  writeFileSync(mapFile, JSON.stringify(map, null, 2));
}

writeMap();
console.log(`\nDone. Map now has ${Object.keys(map.products).length} products (${map.failed?.length ?? 0} failed).`);