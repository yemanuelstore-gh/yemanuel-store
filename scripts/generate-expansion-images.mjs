// Append-only expansion image generator.
//
// Writes deterministic product SVGs for the expansion catalogue only.
// Unlike generate-real-images.mjs, this script NEVER deletes or overwrites
// existing files: it skips any product slug that already has an SVG in
// public/images/products/, writes only missing files and merges the new
// filenames into INDEX.json without touching existing entries.
//
// Safe to re-run after interruption — it resumes where it left off.
//
// Reads scripts/catalogue-data/expansion-image-manifest.json (emitted by
// generate-expansion-catalogue.mjs) which lists only the new product slugs.

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = `${__dirname}/..`;
const outDir = `${root}/public/images/products`;

const PALETTES = {
  mobile: ["#3730a3", "#6366f1"],
  electronics: ["#1e3a8a", "#2563eb"],
  fashion: ["#881337", "#e11d48"],
  cosmetics: ["#701a75", "#db2777"],
  home: ["#92400e", "#f59e0b"],
  gaming: ["#5b21b6", "#8b5cf6"],
};

const ICONS = {
  mobile: ["M220,320 h360 v240 a20,20 0 0 1 -20,20 h-320 a20,20 0 0 1 -20,-20 z", "M370,580 h60"],
  electronics: ["M200,280 h400 a20,20 0 0 1 20,20 v200 a20,20 0 0 1 -20,20 h-400 a20,20 0 0 1 -20,-20 v-200 a20,20 0 0 1 20,-20 z", "M380,540 h40"],
  fashion: ["M400,220 l120,120 h-70 v140 h-100 v-140 h-70 z", "M360,340 h80"],
  cosmetics: ["M340,240 h120 l20,60 h-160 z M340,300 h120 v200 a20,20 0 0 1 -20,20 h-80 a20,20 0 0 1 -20,-20 z", "M360,400 h80"],
  home: ["M220,420 l180,-160 l180,160 v140 a20,20 0 0 1 -20,20 h-320 a20,20 0 0 1 -20,-20 z", "M380,420 v120"],
  gaming: ["M240,340 h320 l40,60 a24,24 0 0 1 -20,36 l-60,-10 a24,24 0 0 0 -20,6 l-40,32 a20,20 0 0 1 -24,0 l-40,-32 a24,24 0 0 0 -20,-6 l-60,10 a24,24 0 0 1 -20,-36 z", "M340,360 h16 M344,356 v16"],
};

function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h;
}

function esc(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function wrapText(text, maxLen, maxLines) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if (cur && cur.length + w.length + 1 > maxLen) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (lines.length < maxLines && cur) lines.push(cur);
  while (lines.length < maxLines) lines.push("");
  return lines;
}

function svgFor({ slug, name, dept, brand }) {
  const [c1, c2] = PALETTES[dept] ?? PALETTES.gaming;
  const h = hash(slug);
  const [iconMain, iconAccent] = ICONS[dept] ?? ICONS.gaming;
  const lines = wrapText(name, 22, 3);
  const brandLabel = brand ? esc(brand.toUpperCase().slice(0, 22)) : "YEMANUEL STORE";
  const tint = `rgba(255,255,255,${0.06 + (h % 40) / 100})`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800" role="img" aria-label="${esc(name)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
    <linearGradient id="card" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.98"/>
      <stop offset="1" stop-color="#f3f4f6"/>
    </linearGradient>
  </defs>
  <rect width="800" height="800" fill="url(#bg)"/>
  <circle cx="${120 + (h % 200)}" cy="${140 + ((h >> 3) % 200)}" r="180" fill="${tint}"/>
  <circle cx="${620 - (h % 180)}" cy="${620 - ((h >> 5) % 180)}" r="120" fill="${tint}"/>
  <rect x="120" y="120" width="560" height="560" rx="36" fill="url(#card)" opacity="0.96"/>
  <circle cx="660" cy="140" r="14" fill="${c2}" opacity="0.85"/>
  <circle cx="620" cy="140" r="10" fill="${c2}" opacity="0.5"/>
  <text x="160" y="180" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="${c1}">${brandLabel}</text>
  <g transform="translate(210 300)" fill="${c1}" opacity="0.9">
    <path d="${iconMain}"/>
    <path d="${iconAccent}" fill="none" stroke="${c2}" stroke-width="10" stroke-linecap="round"/>
  </g>
  <text x="160" y="590" font-family="system-ui, sans-serif" font-size="30" font-weight="600" fill="#111827">
    <tspan x="160" dy="0">${esc(lines[0])}</tspan>
    ${lines[1] ? `<tspan x="160" dy="38">${esc(lines[1])}</tspan>` : ""}
    ${lines[2] ? `<tspan x="160" dy="38">${esc(lines[2])}</tspan>` : ""}
  </text>
  <text x="160" y="682" font-family="system-ui, sans-serif" font-size="20" fill="#6b7280">Yemanuel Store — Ghana</text>
</svg>`;
}

mkdirSync(outDir, { recursive: true });

const manifest = JSON.parse(readFileSync(`${root}/scripts/catalogue-data/expansion-image-manifest.json`, "utf8"));

// Existing files are never touched.
const existing = new Set(readdirSync(outDir).filter((f) => f.endsWith(".svg")));

let written = 0;
const skipped = [];
const files = [...existing];

for (const p of manifest.products) {
  const file = `${p.slug}.svg`;
  if (existing.has(file)) {
    skipped.push(file);
    continue;
  }
  writeFileSync(join(outDir, file), svgFor(p));
  files.push(file);
  written += 1;
  if (written % 500 === 0) console.log(`... ${written} new SVGs written`);
}

// Merge into INDEX.json — existing entries are preserved.
const indexFile = join(outDir, "INDEX.json");
let index = { count: 0, files: [] };
if (existsSync(indexFile)) {
  try {
    index = JSON.parse(readFileSync(indexFile, "utf8"));
  } catch {
    index = { count: 0, files: [] };
  }
}
const known = new Set(index.files);
for (const f of files) if (!known.has(f)) index.files.push(f);
index.count = index.files.length;
writeFileSync(indexFile, JSON.stringify(index, null, 2));

console.log(`\nWrote ${written} new expansion SVGs (skipped ${skipped.length} existing)`);
console.log(`INDEX.json now tracks ${index.count} files (previous ${index.files.length - written})`);