export function escapeHtml(value: unknown): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeRegExp(value: string): string {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function hashLocalPassword(email: string, password: string): Promise<string> {
  const payload = `${String(email).trim().toLowerCase()}:${password}:crowforza-local-v1`;
  const data = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(8);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

export function highlightMatch(text: string, query: string): string {
  const safeText = escapeHtml(text);
  // Escapar cada término igual que el texto, para poder resaltar queries con <>&
  const terms = String(query)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => escapeRegExp(escapeHtml(term)));
  if (!terms.length) return safeText;
  const pattern = new RegExp(`(${terms.join("|")})`, "gi");
  return safeText.replace(pattern, "<mark>$1</mark>");
}
