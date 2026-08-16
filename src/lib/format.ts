export function capitalize(str: string): string {
  return String(str).charAt(0).toUpperCase() + String(str).slice(1);
}

export function getBadgeText(badge: string): string {
  return ({ new: "Nuevo", sale: "Oferta", hot: "Popular" } as Record<string, string>)[badge] || badge;
}

export function generateStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - Number(hasHalfStar);
  return `${'<i class="fa-solid fa-star"></i>'.repeat(fullStars)}${
    hasHalfStar ? '<i class="fa-solid fa-star-half-stroke"></i>' : ""
  }${'<i class="fa-regular fa-star"></i>'.repeat(emptyStars)}`;
}
