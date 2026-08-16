/**
 * Descarga logos de marcas del hero a public/assets/brands (WebP/SVG).
 * Uso: node scripts/optimize-brands.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "public", "assets", "brands");
const mirrorDir = path.join(root, "assets", "brands");

const BRANDS = [
  {
    slug: "cat",
    urls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Caterpillar_logo.svg/320px-Caterpillar_logo.svg.png",
      "https://s7d2.scene7.com/is/image/Caterpillar/CM20200219-db34e-f70d2?fmt=png-alpha",
    ],
  },
  {
    slug: "bosch",
    urls: ["https://upload.wikimedia.org/wikipedia/commons/1/16/Bosch-logo.svg"],
    preferSvg: true,
  },
  {
    slug: "makita",
    urls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Makita_logo.svg/320px-Makita_logo.svg.png",
      "https://www.wmv-dresden.de/wp-content/uploads/2016/12/makita_logo.png",
    ],
  },
  {
    slug: "sata",
    urls: [
      "https://www.sata.com.co/themes/custom/sata/icons/logo.svg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/SATA_logo.svg/320px-SATA_logo.svg.png",
    ],
    preferSvg: true,
  },
  {
    slug: "bahco",
    urls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4d/Bahco_logo.svg/320px-Bahco_logo.svg.png",
      "https://static.bahco.com/static/version1766566234/frontend/On4u/newbahco/es_AR/images/logo.svg",
    ],
  },
  {
    slug: "milwaukee",
    urls: [
      "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Milwaukee_Tool_logo.svg/320px-Milwaukee_Tool_logo.svg.png",
      "https://www.milwaukeetool.com/--/web-images/sc/0242a505cb7b4d8197adbec908c139c2?hash=7dea362b3fac8e00956a4952a3d4f474&lang=es-US&mw=267",
    ],
  },
  {
    slug: "dewalt",
    urls: [
      "https://upload.wikimedia.org/wikipedia/commons/8/89/DeWalt_Logo.svg",
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/DeWalt_Logo.svg/320px-DeWalt_Logo.svg.png",
    ],
    preferSvg: true,
  },
  {
    slug: "bremen",
    urls: [
      "https://bremenar.vtexassets.com/assets/vtex.file-manager-graphql/images/46cf5dcb-d1ef-4d79-951e-d9bec9200bca___17d331b38fd56dc525d7f194538ae44a.png",
    ],
  },
];

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CrowforzaBrandOptimizer/1.0)",
        Accept: "image/*,*/*",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const contentType = res.headers.get("content-type") || "";
    const buf = Buffer.from(await res.arrayBuffer());
    return { buf, contentType, url };
  } finally {
    clearTimeout(timer);
  }
}

async function makeTextLogo(outPath, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120">
    <rect width="100%" height="100%" fill="#f5f5f5"/>
    <text x="50%" y="55%" fill="#222" font-family="Arial,sans-serif" font-size="28" font-weight="700" text-anchor="middle">${label.toUpperCase()}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 85 }).toFile(outPath);
}

async function saveBrand(brand) {
  let lastError = null;
  for (const url of brand.urls) {
    try {
      const { buf, contentType } = await fetchBuffer(url);
      const isSvg =
        brand.preferSvg ||
        contentType.includes("svg") ||
        url.toLowerCase().endsWith(".svg");

      if (isSvg && (contentType.includes("svg") || buf.slice(0, 200).toString("utf8").includes("<svg"))) {
        const file = `${brand.slug}.svg`;
        const outPath = path.join(outDir, file);
        await fs.writeFile(outPath, buf);
        await fs.copyFile(outPath, path.join(mirrorDir, file));
        console.log(`OK  ${file} (svg)`);
        return `/assets/brands/${file}`;
      }

      const file = `${brand.slug}.webp`;
      const outPath = path.join(outDir, file);
      await sharp(buf)
        .rotate()
        .resize({ width: 320, height: 160, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 85, alphaQuality: 90 })
        .toFile(outPath);
      await fs.copyFile(outPath, path.join(mirrorDir, file));
      const stat = await fs.stat(outPath);
      console.log(`OK  ${file} (${Math.round(stat.size / 1024)} KB)`);
      return `/assets/brands/${file}`;
    } catch (err) {
      lastError = err;
      console.warn(`retry ${brand.slug}: ${err.message}`);
    }
  }

  const file = `${brand.slug}.webp`;
  const outPath = path.join(outDir, file);
  await makeTextLogo(outPath, brand.slug);
  await fs.copyFile(outPath, path.join(mirrorDir, file));
  console.warn(`FAIL ${brand.slug}: ${lastError?.message || "unknown"} → text logo`);
  return `/assets/brands/${file}`;
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(mirrorDir, { recursive: true });
  const map = {};
  for (const brand of BRANDS) {
    map[brand.slug] = await saveBrand(brand);
  }
  await fs.writeFile(path.join(outDir, "map.json"), JSON.stringify(map, null, 2));
  console.log("\nListo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
