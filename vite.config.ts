import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: https: blob:; media-src 'self' https: blob:; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mercadopago.com;",
};

export default defineConfig({
  root: ".",
  publicDir: "public",
  server: {
    port: 3000,
    open: false,
    headers: securityHeaders,
  },
  preview: {
    headers: securityHeaders,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: path.resolve(rootDir, "index.html"),
        privacy: path.resolve(rootDir, "privacy.html"),
        terms: path.resolve(rootDir, "terms.html"),
        cookies: path.resolve(rootDir, "cookies.html"),
      },
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.{test,spec}.ts"],
  },
});
