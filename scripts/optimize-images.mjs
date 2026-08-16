/**
 * Descarga imágenes remotas de productos/categorías, las comprime a WebP
 * y reescribe las rutas en src/data/products.ts (+ genera mapa de categorías).
 *
 * Uso: node scripts/optimize-images.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const productsDir = path.join(root, "public", "assets", "products");
const categoriesDir = path.join(root, "public", "assets", "categories");
const productsTsPath = path.join(root, "src", "data", "products.ts");
const mirrorProductsDir = path.join(root, "assets", "products");
const mirrorCategoriesDir = path.join(root, "assets", "categories");

const PRODUCTS = [
  { id: 1, slug: "martillo-stanley", url: "https://images.prom.ua/994905623_w640_h640_molotok-plotnika-stanley.jpg" },
  { id: 2, slug: "martillo-demoledor-cat", url: "https://cdn11.bigcommerce.com/s-ftsflnse4o/images/stencil/608x608/products/1395109/5613275/D_834030-MLA47696457044_092021-O__68693.1732688090.jpg?c=1" },
  { id: 3, slug: "maza-goma", url: "https://hamilton.com.ar/wp-content/uploads/2023/07/MAG670.jpg" },
  { id: 4, slug: "set-precision-12", url: "https://http2.mlstatic.com/D_NQ_NP_851141-CBT53775677886_022023-O.webp" },
  { id: 5, slug: "set-destornilladores-119", url: "https://m.media-amazon.com/images/I/71rM-D2L5aL._AC_SL1500_.jpg" },
  { id: 6, slug: "set-phillips-6", url: "https://ferreteriavidri.com/images/items/large/85876.jpg" },
  { id: 7, slug: "llaves-combinadas-12", url: "https://i.ebayimg.com/images/g/ancAAeSwSWZn61wc/s-l1200.webp" },
  { id: 8, slug: "llave-inglesa-10", url: "https://th.bing.com/th/id/R.da55af6ceb519b74494065c77f754617?rik=bJFb4C3cMZcY9g&pid=ImgRaw&r=0" },
  { id: 9, slug: "llaves-allen", url: "https://m.media-amazon.com/images/I/715kTSCM-yL._AC_SL1500_.jpg" },
  { id: 10, slug: "alicates-tope", url: "https://img.lojadomecanico.com.br/IMAGENS/2/468/388185/1666965529306.JPG" },
  { id: 11, slug: "alicates-corte", url: "https://biassoni.com.ar/wp-content/uploads/2022/01/Alicate992811.jpg" },
  { id: 12, slug: "alicates-punta", url: "https://m.media-amazon.com/images/I/51Ogl0+2yEL._AC_SL500_.jpg" },
  { id: 13, slug: "cinta-metrica-5m", url: "https://cdn.homedepot.com.mx/productos/130069/130069-z.jpg" },
  { id: 14, slug: "nivel-burbuja-60", url: "https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=900&q=80" },
  { id: 15, slug: "calibre-digital", url: "https://media.adeo.com/mkp/058dc38697bbc1cf6cf99d69e0ee8783/media.png" },
  { id: 16, slug: "sierra-mano-universal", url: "https://media.adeo.com/mkp/582b8d465e8233c3c90533d98c949c0c/media.jpeg?width=3000&height=3000&format=jpg&quality=80&fit=bounds" },
  { id: 17, slug: "serrucho-22", url: "https://cdn.homedepot.com.mx/productos/884260/884260-za4.jpg" },
  { id: 18, slug: "sierra-caladora", url: "https://urreastore.com.mx/7796-large_default/skb920-sierra-caladora-inalambrica-urrea.jpg" },
];

const CATEGORIES = [
  { slug: "martillos", url: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?w=800" },
  { slug: "destornilladores", url: "https://hips.hearstapps.com/vader-prod.s3.amazonaws.com/1644336193-craftsman-cmht65618v-1644336184.jpg?crop=1xw:1xh;center,top&resize=980:*" },
  { slug: "llaves", url: "https://media.knova.com.mx/products/10482@2x.jpg?t=inicial" },
  { slug: "alicates", url: "https://media.wuerth.com//stmedia/wuerth/images/std.lang.all/resolutions/category/576px/846726.jpg" },
  { slug: "medicion", url: "https://www.elmecaniquejo.com/wp-content/uploads/2020/11/IMG_20201109_223850-3000x2250.jpg" },
  { slug: "sierras", url: "https://images.falabella.com/v3/assets/blt5e6c562c7d14bc51/blt3b0dbc17dc8e2ee1/63d83e8ee480c910d1acb3f1/sierra_circular_img1.png" },
];

async function ensureDirs() {
  await fs.mkdir(productsDir, { recursive: true });
  await fs.mkdir(categoriesDir, { recursive: true });
  await fs.mkdir(mirrorProductsDir, { recursive: true });
  await fs.mkdir(mirrorCategoriesDir, { recursive: true });
}

async function fetchBuffer(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CrowforzaImageOptimizer/1.0)",
        Accept: "image/*,*/*",
      },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  } finally {
    clearTimeout(timer);
  }
}

async function makePlaceholder(outPath, label) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800">
    <rect width="100%" height="100%" fill="#1f2933"/>
    <text x="50%" y="48%" fill="#f0c75e" font-family="Arial,sans-serif" font-size="42" text-anchor="middle">CROWFORZA</text>
    <text x="50%" y="58%" fill="#9aa5b1" font-family="Arial,sans-serif" font-size="22" text-anchor="middle">${label}</text>
  </svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(outPath);
}

async function optimizeToWebp(input, outPath, maxWidth) {
  await sharp(input)
    .rotate()
    .resize({ width: maxWidth, height: maxWidth, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toFile(outPath);
}

async function processOne(item, outDir, mirrorDir, maxWidth) {
  const outPath = path.join(outDir, `${item.slug}.webp`);
  const mirrorPath = path.join(mirrorDir, `${item.slug}.webp`);
  try {
    const buf = await fetchBuffer(item.url);
    await optimizeToWebp(buf, outPath, maxWidth);
    await fs.copyFile(outPath, mirrorPath);
    const stat = await fs.stat(outPath);
    console.log(`OK  ${item.slug}.webp (${Math.round(stat.size / 1024)} KB)`);
    return true;
  } catch (err) {
    console.warn(`FAIL ${item.slug}: ${err.message} → placeholder`);
    await makePlaceholder(outPath, item.slug);
    await fs.copyFile(outPath, mirrorPath);
    return false;
  }
}

async function rewriteProductsTs(mapById) {
  let source = await fs.readFile(productsTsPath, "utf8");
  for (const [id, localPath] of mapById) {
    // Replace the image URL that belongs to this product block (by id proximity).
    const idPattern = new RegExp(
      `(id:\\s*${id}[\\s\\S]*?image:\\s*")([^"]+)(")`,
      "m"
    );
    if (!idPattern.test(source)) {
      console.warn(`No se encontró image para id=${id}`);
      continue;
    }
    source = source.replace(idPattern, `$1${localPath}$3`);
  }
  await fs.writeFile(productsTsPath, source, "utf8");
  console.log("Actualizado src/data/products.ts");
}

async function main() {
  await ensureDirs();
  const map = new Map();

  console.log("\n=== Productos ===");
  for (const item of PRODUCTS) {
    await processOne(item, productsDir, mirrorProductsDir, 900);
    map.set(item.id, `/assets/products/${item.slug}.webp`);
  }

  console.log("\n=== Categorías ===");
  for (const item of CATEGORIES) {
    await processOne(item, categoriesDir, mirrorCategoriesDir, 800);
  }

  await rewriteProductsTs(map);
  console.log("\nListo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
