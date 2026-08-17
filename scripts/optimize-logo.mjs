/**
 * Genera logo WebP y favicons desde assets/logo-crowforza.jpg
 * Uso: node scripts/optimize-logo.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "assets", "logo-crowforza.jpg");

async function main() {
  await fs.access(src);
  const publicAssets = path.join(root, "public", "assets");
  await fs.mkdir(publicAssets, { recursive: true });

  await sharp(src).webp({ quality: 88 }).toFile(path.join(publicAssets, "logo-crowforza.webp"));
  await sharp(src).resize(32, 32, { fit: "contain", background: "#ffffff" }).png().toFile(path.join(root, "public", "favicon-32.png"));
  await sharp(src).resize(64, 64, { fit: "contain", background: "#ffffff" }).png().toFile(path.join(root, "public", "favicon.png"));
  await sharp(src).resize(180, 180, { fit: "contain", background: "#ffffff" }).png().toFile(path.join(root, "public", "apple-touch-icon.png"));
  await sharp(src).resize(512, 512, { fit: "contain", background: "#ffffff" }).png().toFile(path.join(publicAssets, "logo-crowforza-512.png"));
  console.log("Logo WebP + favicons listos.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
