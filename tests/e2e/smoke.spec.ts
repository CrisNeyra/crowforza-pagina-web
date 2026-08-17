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

test("el menú sigue el orden Inicio → Nosotros → Categorías → Catálogo → Contacto", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page.locator("#nav-menu .nav__link").evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).getAttribute("href"))
  );
  expect(hrefs).toEqual(["#home", "#about", "#categories", "#catalog", "#contact"]);
});

test("búsqueda sin resultados muestra CTA al catálogo", async ({ page }) => {
  await page.goto("/");
  await page.locator("#search-input").fill("zzzznoexiste999");
  await page.locator("#search-btn").click();
  await expect(page.locator(".search-no-results")).toBeVisible();
  await expect(page.locator(".search-no-results [data-catalog-cta]")).toContainText("Ver catálogo");
});

test("card sin stock muestra overlay si hay un producto agotado", async ({ page }) => {
  await page.goto("/");
  await page.locator("#catalog").scrollIntoViewIfNeeded();
  const oos = page.locator(".product-card--out");
  if ((await oos.count()) > 0) {
    await expect(oos.first().locator(".product-card__oos-overlay")).toHaveText(/Sin stock/i);
    await expect(oos.first().locator('[data-action="add-cart"]')).toBeDisabled();
  }
});

test("formulario de contacto tiene campos requeridos", async ({ page }) => {
  await page.goto("/#contact");
  await page.locator("#contact-form").scrollIntoViewIfNeeded();
  await expect(page.locator("#name")).toBeVisible();
  await expect(page.locator("#email")).toHaveAttribute("type", "email");
  await expect(page.locator("#message")).toBeVisible();
});
