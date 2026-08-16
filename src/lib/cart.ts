import type { CartItem, Product } from "../types/product";

export function addToCartState(
  cart: CartItem[],
  product: Pick<Product, "id" | "name" | "price" | "image">,
  quantity = 1
): CartItem[] {
  if (quantity <= 0) return cart.map((item) => ({ ...item }));

  const next = cart.map((item) => ({ ...item }));
  const existing = next.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += quantity;
    return next;
  }

  next.push({
    id: product.id,
    name: product.name,
    price: product.price,
    image: product.image,
    quantity,
  });
  return next;
}

export function updateCartItemQuantityState(
  cart: CartItem[],
  productId: number,
  delta: number
): CartItem[] {
  return cart
    .map((item) =>
      item.id === productId ? { ...item, quantity: item.quantity + delta } : { ...item }
    )
    .filter((item) => item.quantity > 0);
}

export function removeCartItemState(cart: CartItem[], productId: number): CartItem[] {
  return cart.filter((item) => item.id !== productId);
}

export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function calculateCartCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}
