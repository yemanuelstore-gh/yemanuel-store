// Generates deterministic local placeholder images for the demo catalogue.
//
// These are simple branded SVGs (gradient + monogram) stored under
// public/images/products/ so the storefront always renders a valid
// same-origin image (see isAllowedStoreImage in src/lib/image-config.ts).
// When real product photography arrives, replace the product_images rows
// (URLs) and delete this folder + this script.

import { mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "public", "images", "products");

const DEPARTMENTS = [
  {
    key: "fashion",
    label: "FASHION",
    palettes: [
      ["#5b3a29", "#c9a227"],
      ["#6d3b2f", "#e0b64e"],
      ["#4a2c26", "#b98a3e"],
      ["#7a4a2f", "#d9a441"],
      ["#3f2a22", "#a97e34"],
    ],
  },
  {
    key: "electronics",
    label: "TECH",
    palettes: [
      ["#0b1d33", "#2f6fb2"],
      ["#0d2740", "#3f8fd0"],
      ["#081a2e", "#2a5f97"],
      ["#122c47", "#4b9bd8"],
      ["#0a1f38", "#3572b8"],
    ],
  },
  {
    key: "cosmetics",
    label: "BEAUTY",
    palettes: [
      ["#4a2434", "#c97a8f"],
      ["#3d2033", "#b96a85"],
      ["#552a3d", "#d6899c"],
      ["#44223a", "#c0708d"],
      ["#2e1a2b", "#a45a74"],
    ],
  },
  {
    key: "home",
    label: "HOME",
    palettes: [
      ["#1f3d33", "#6fa08a"],
      ["#27483c", "#7cae96"],
      ["#1a332c", "#5f8f7b"],
      ["#305446", "#8bb7a2"],
      ["#14302a", "#517f6c"],
    ],
  },
];

const GENERIC = [
  ["#123049", "#8a6f2f"],
  ["#233f5c", "#6b4f22"],
  ["#0e2b42", "#a1843f"],
  ["#1b3a55", "#7c6530"],
];

function monogramSvg(bgTop, bgBottom, label, letter) {
  const a = bgTop;
  const b = bgBottom;
  const accent = "#f2d9a0";
  const ivory = "#f8f6f1";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${a}"/>
      <stop offset="1" stop-color="${b}"/>
    </linearGradient>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="${ivory}" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="600" height="600" fill="url(#g)"/>
  <rect width="600" height="600" fill="url(#grid)"/>
  <circle cx="300" cy="270" r="118" fill="none" stroke="${accent}" stroke-opacity="0.5" stroke-width="2"/>
  <circle cx="300" cy="270" r="104" fill="${accent}" fill-opacity="0.10"/>
  <text x="300" y="310" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic" font-size="118" fill="${ivory}" fill-opacity="0.92">${letter}</text>
  <text x="300" y="472" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" letter-spacing="10" fill="${accent}">${label}</text>
  <text x="300" y="520" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" letter-spacing="4" fill="${ivory}" fill-opacity="0.7">YEMANUEL STORE</text>
</svg>
`;
}


mkdirSync(OUT, { recursive: true });

let written = 0;
const manifest = [];

for (const dept of DEPARTMENTS) {
  dept.palettes.forEach((palette, i) => {
    const letter = dept.label.charAt(0);
    const file = `demo-${dept.key}-${i + 1}.svg`;
    writeFileSync(join(OUT, file), monogramSvg(...palette, dept.label, letter));
    manifest.push(file);
    written += 1;
  });
}

GENERIC.forEach((palette, i) => {
  const file = `demo-generic-${i + 1}.svg`;
  writeFileSync(join(OUT, file), monogramSvg(...palette, "YEMANUEL", "Y"));
  manifest.push(file);
  written += 1;
});

writeFileSync(
  join(__dirname, "..", "public", "images", "products", "INDEX.json"),
  JSON.stringify({ count: written, files: manifest }, null, 2),
);

console.log(`Wrote ${written} placeholder SVGs to public/images/products/`);
