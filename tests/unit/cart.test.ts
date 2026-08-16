import { describe, expect, it } from "vitest";
import {
  addToCartState,
  calculateCartCount,
  calculateCartTotal,
  removeCartItemState,
  updateCartItemQuantityState,
} from "../../src/lib/cart";

const hammer = {
  id: 1,
  name: "Martillo",
  price: 1000,
  image: "/hammer.jpg",
};

const wrench = {
  id: 2,
  name: "Llave",
  price: 2500,
  image: "/wrench.jpg",
};

describe("cart state helpers", () => {
  it("agrega un producto nuevo", () => {
    const cart = addToCartState([], hammer, 2);
    expect(cart).toEqual([{ ...hammer, quantity: 2 }]);
  });

  it("suma cantidad si el producto ya está", () => {
    const initial = addToCartState([], hammer, 1);
    const cart = addToCartState(initial, hammer, 3);
    expect(cart[0]?.quantity).toBe(4);
  });

  it("actualiza cantidad y elimina si llega a 0", () => {
    const initial = addToCartState([], hammer, 1);
    const empty = updateCartItemQuantityState(initial, 1, -1);
    expect(empty).toEqual([]);
  });

  it("remueve un ítem y calcula totales", () => {
    let cart = addToCartState([], hammer, 2);
    cart = addToCartState(cart, wrench, 1);
    cart = removeCartItemState(cart, 1);
    expect(cart).toHaveLength(1);
    expect(calculateCartTotal(cart)).toBe(2500);
    expect(calculateCartCount(cart)).toBe(1);
  });
});
