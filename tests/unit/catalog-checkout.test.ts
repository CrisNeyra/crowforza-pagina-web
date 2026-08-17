import { describe, expect, it } from "vitest";
import { countProductsByCategory, describeStockChange, quoteCartAgainstCatalog } from "../../src/lib/catalog";
import { products as fallbackProducts } from "../../src/data/products";
import { validateEmail, validateMediumPassword } from "../../src/lib/validation";
import { nextOrderStatus, parseMpSignatureHeader, buildMpSignatureManifest } from "../../src/lib/mpWebhook";

describe("catalog quote", () => {
  it("usa el precio oficial y no el del carrito", () => {
    const quoted = quoteCartAgainstCatalog([
      { id: 1, name: "hack", price: 1, image: "x", quantity: 2 },
    ]);
    expect(quoted.items[0]?.unit_price).toBe(31490);
    expect(quoted.total).toBe(62980);
  });

  it("rechaza un producto inexistente", () => {
    expect(() =>
      quoteCartAgainstCatalog([{ id: 999, name: "x", price: 10, image: "x", quantity: 1 }])
    ).toThrow(/no disponible/i);
  });

  it("rechaza si no hay stock suficiente", () => {
    expect(() =>
      quoteCartAgainstCatalog(
        [{ id: 1, name: "Martillo", price: 1, image: "x", quantity: 3 }],
        [
          {
            id: 1,
            name: "Martillo",
            category: "martillos",
            price: 31490,
            oldPrice: null,
            image: "x",
            rating: 5,
            reviews: 1,
            badge: null,
            description: "",
            stock: 2,
            inStock: true,
            featured: false,
          },
        ]
      )
    ).toThrow(/no disponible/i);
  });

  it("describe el cambio de stock para el toast de inventario", () => {
    expect(describeStockChange("Martillo", 24, 20)).toBe("Martillo: stock 24 → 20");
  });

  it("cuenta productos por categoría", () => {
    expect(countProductsByCategory(fallbackProducts, "martillos")).toBeGreaterThan(0);
  });
});

describe("validation", () => {
  it("acepta emails válidos", () => {
    expect(validateEmail("info@crowforza.com")).toBe(true);
    expect(validateEmail("malo")).toBe(false);
  });

  it("exige password de 8+ con letra y número", () => {
    expect(validateMediumPassword("abc12345")).toBe(true);
    expect(validateMediumPassword("short1")).toBe(false);
    expect(validateMediumPassword("sinnumeros")).toBe(false);
  });
});

describe("mp webhook helpers", () => {
  it("no degrada un pedido paid a pending", () => {
    expect(nextOrderStatus("paid", "pending")).toBe("paid");
    expect(nextOrderStatus("paid", "refunded")).toBe("refunded");
    expect(nextOrderStatus("pending", "paid")).toBe("paid");
  });

  it("parsea x-signature de Mercado Pago", () => {
    const parsed = parseMpSignatureHeader("ts=1704908010,v1=abc123");
    expect(parsed).toEqual({ ts: "1704908010", v1: "abc123" });
    expect(buildMpSignatureManifest("123", "req-1", "1704908010")).toBe(
      "id:123;request-id:req-1;ts:1704908010;"
    );
  });
});
