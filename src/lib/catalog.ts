import { products as fallbackProducts } from "../data/products";
import type { CartItem, Product } from "../types/product";

export type CatalogEntry = Pick<Product, "id" | "name" | "price" | "inStock" | "image" | "stock">;

export type DbProductRow = {
  id: number;
  name: string;
  category: string;
  price: number | string;
  old_price: number | string | null;
  image: string;
  rating: number | string;
  reviews: number;
  badge: Product["badge"];
  description: string;
  stock: number;
  featured: boolean;
  active?: boolean;
};

export function mapDbProduct(row: DbProductRow): Product {
  const stock = Math.max(0, Number(row.stock) || 0);
  return {
    id: Number(row.id),
    name: row.name,
    category: row.category,
    price: Number(row.price),
    oldPrice: row.old_price == null ? null : Number(row.old_price),
    image: row.image,
    rating: Number(row.rating),
    reviews: Number(row.reviews) || 0,
    badge: row.badge ?? null,
    description: row.description || "",
    stock,
    inStock: stock > 0,
    featured: Boolean(row.featured),
  };
}

export function quoteCartAgainstCatalog(
  cart: CartItem[],
  catalogList: Product[] = fallbackProducts
): {
  items: Array<{
    product_id: number;
    product_name: string;
    unit_price: number;
    quantity: number;
  }>;
  total: number;
} {
  const byId = new Map(catalogList.map((product) => [product.id, product]));
  const items = [];
  for (const line of cart) {
    const product = byId.get(line.id);
    const quantity = Math.max(1, Math.floor(Number(line.quantity) || 0));
    const available = product?.stock ?? (product?.inStock ? Number.MAX_SAFE_INTEGER : 0);
    if (!product || !product.inStock || available < quantity) {
      throw new Error(`Producto no disponible: ${line.name || line.id}`);
    }
    items.push({
      product_id: product.id,
      product_name: product.name,
      unit_price: product.price,
      quantity,
    });
  }
  if (!items.length) {
    throw new Error("El carrito está vacío.");
  }
  const total = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  return { items, total };
}

export function countProductsByCategory(productList: Product[], categoryId: string): number {
  return productList.filter((product) => product.category === categoryId).length;
}

export function describeStockChange(name: string, from: number, to: number): string {
  return `${name}: stock ${from} → ${to}`;
}
