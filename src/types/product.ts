export type ProductBadge = "sale" | "new" | "hot" | null;

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  oldPrice: number | null;
  image: string;
  rating: number;
  reviews: number;
  badge: ProductBadge;
  description: string;
  stock: number;
  inStock: boolean;
  featured: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
  image?: string;
}

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

export type OrderStatus = "pending" | "paid" | "cancelled" | "refunded" | "failed";
