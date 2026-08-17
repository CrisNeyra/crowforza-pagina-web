import { expect, test } from "@playwright/test";

test("carga home y muestra marca CROWFORZA", async ({ page }) => {
  await page.goto("/");
  const brand = page.locator("#header .nav__logo");
  await expect(brand.locator(".logo-crow")).toContainText("CROW");
  await expect(brand.locator(".logo-forza")).toContainText("FORZA");
});

test("agrega un producto al carrito desde el catálogo", async ({ page }) => {
  await page.goto("/");
  await page.locator("#catalog").scrollIntoViewIfNeeded();

  const addBtn = page.locator('#products-grid [data-action="add-cart"]').first();
  await expect(addBtn).toBeVisible({ timeout: 15_000 });
  await addBtn.click();

  await page.locator("#cart-btn").click();
  await expect(page.locator("#cart-drawer")).toHaveClass(/active/);
  await expect(page.locator("#cart-items")).not.toContainText("vacío");
  await expect(page.locator("#cart-total")).not.toHaveText("$0");
  await expect(page.locator("#cart-total")).not.toHaveText("$NaN");
});

test("WhatsApp apunta al número real y las marcas se ven", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#whatsapp-btn")).toHaveAttribute("href", /wa\.me\/5491178211489/);
  const bahco = page.locator('img.brand-logo[alt="BAHCO"]');
  await expect(bahco).toBeVisible();
  const width = await bahco.evaluate((img: HTMLImageElement) => img.naturalWidth);
  expect(width).toBeGreaterThan(0);
});

test("Nosotros tiene carrusel y el hero no usa el MP4 de 38MB", async ({ page }) => {
  await page.goto("/");
  const hero = page.locator("#hero-video source");
  await expect(hero).toHaveAttribute("src", "/assets/videos/hero.mp4");
  await page.locator("#about").scrollIntoViewIfNeeded();
  await expect(page.locator("#about-slideshow")).toBeVisible();
  await expect(page.locator(".about__watermark")).toBeVisible();
});

test("formulario de contacto tiene campos requeridos", async ({ page }) => {
  await page.goto("/#contact");
  await page.locator("#contact-form").scrollIntoViewIfNeeded();
  await expect(page.locator("#name")).toBeVisible();
  await expect(page.locator("#email")).toHaveAttribute("type", "email");
  await expect(page.locator("#message")).toBeVisible();
});
