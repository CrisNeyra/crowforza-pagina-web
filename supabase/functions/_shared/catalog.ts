/** Precios oficiales (espejo de src/data/products.ts). El cliente no define el monto. */
export const CATALOG: Record<number, { name: string; price: number; inStock: boolean }> = {
  1: { name: "Martillo de Carpintero Stanley Pro", price: 31490, inStock: true },
  2: { name: "Martillo Demoledor Cat DX29 14,9kg 50J 1750W", price: 36200, inStock: true },
  3: { name: "Maza de Goma Profesional", price: 19900, inStock: true },
  4: { name: "Set Destornilladores Precision 12 pzas", price: 26200, inStock: true },
  5: {
    name: "Juego de 119 pcs destornilladores profesionales magnéticos con soporte organizador.",
    price: 94500,
    inStock: true,
  },
  6: { name: "Set Destornilladores Phillips 6 pzas", price: 20990, inStock: true },
  7: { name: "Juego De Llaves Combinadas 6 A 19 Mm 12 Piezas", price: 62990, inStock: true },
  8: { name: 'Llave Inglesa Ajustable 10"', price: 23600, inStock: true },
  9: { name: "Set Llaves Allen Hexagonales", price: 16800, inStock: true },
  10: { name: "Alicates Tope de gama", price: 45100, inStock: true },
  11: { name: "Alicates de Corte Diagonal", price: 19900, inStock: true },
  12: { name: "Alicates de Punta Larga", price: 17300, inStock: true },
  13: { name: "Cinta Métrica 5m", price: 13600, inStock: true },
  14: { name: "Nivel de Burbuja 60cm", price: 30400, inStock: true },
  15: { name: "Calibre Digital de Precisión", price: 47250, inStock: true },
  16: { name: "Sierra de Mano Universal", price: 26200, inStock: true },
  17: { name: 'Serrucho Profesional 22"', price: 34100, inStock: true },
  18: { name: "Sierra Caladora Inalámbrica", price: 19900, inStock: true },
};

export function quoteItems(
  raw: Array<{ product_id?: number; quantity?: number }>
): { items: Array<{ product_id: number; product_name: string; unit_price: number; quantity: number }>; total: number } {
  const items = [];
  for (const line of raw) {
    const id = Number(line.product_id);
    const product = CATALOG[id];
    if (!product || !product.inStock) {
      throw new Error(`Producto inválido: ${id}`);
    }
    const quantity = Math.max(1, Math.floor(Number(line.quantity) || 0));
    items.push({
      product_id: id,
      product_name: product.name,
      unit_price: product.price,
      quantity,
    });
  }
  if (!items.length) throw new Error("Sin ítems");
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  return { items, total };
}
