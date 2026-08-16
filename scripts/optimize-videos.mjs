/**
 * Comprime MP4 (H.264, sin audio, faststart) y genera posters WebP.
 * Uso: node scripts/optimize-videos.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public", "assets", "videos");
const posterDir = path.join(outDir, "posters");

const JOBS = [
  { src: path.join(root, "assets", "hero-video.mp4"), out: "hero.mp4", poster: "hero.webp" },
  { src: path.join(root, "assets", "videos", "1amoladora2.mp4"), out: "1amoladora2.mp4", poster: "1amoladora2.webp" },
  { src: path.join(root, "assets", "videos", "2demoledor.mp4"), out: "2demoledor.mp4", poster: "2demoledor.webp" },
  { src: path.join(root, "assets", "videos", "3soldador.mp4"), out: "3soldador.mp4", poster: "3soldador.webp" },
  { src: path.join(root, "assets", "videos", "4amoladora.mp4"), out: "4amoladora.mp4", poster: "4amoladora.webp" },
];

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(bin)} exited ${code}`));
    });
  });
}

async function compress(src, dest) {
  const tmp = `${dest}.tmp.mp4`;
  await run(ffmpegPath, [
    "-y",
    "-i",
    src,
    "-vf",
    "scale='min(1280,iw)':-2",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "28",
    "-an",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    tmp,
  ]);
  await fs.rename(tmp, dest);
}

async function poster(src, destWebp) {
  const tmpJpg = `${destWebp}.tmp.jpg`;
  await run(ffmpegPath, ["-y", "-ss", "00:00:01", "-i", src, "-frames:v", "1", "-q:v", "4", tmpJpg]);
  await sharp(tmpJpg).resize({ width: 1280, withoutEnlargement: true }).webp({ quality: 72 }).toFile(destWebp);
  await fs.unlink(tmpJpg);
}

async function main() {
  if (!ffmpegPath) throw new Error("ffmpeg-static no resolvió el binario");
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(posterDir, { recursive: true });

  for (const job of JOBS) {
    await fs.access(job.src);
    const dest = path.join(outDir, job.out);
    console.log("Comprimiendo", path.basename(job.src));
    await compress(job.src, dest);
    await poster(dest, path.join(posterDir, job.poster));
    const stat = await fs.stat(dest);
    console.log("  →", job.out, `${(stat.size / 1024 / 1024).toFixed(1)} MB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
