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
