const TERMINAL_STATUSES = new Set(["paid", "cancelled", "refunded", "failed"]);

export const MP_STATUS_MAP: Record<string, string> = {
  approved: "paid",
  pending: "pending",
  in_process: "pending",
  rejected: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
};

/** No degradar un pedido ya confirmado (idempotencia). */
export function nextOrderStatus(current: string | null | undefined, incoming: string): string {
  const now = current || "pending";
  if (now === "paid" && incoming !== "refunded") return "paid";
  if (TERMINAL_STATUSES.has(now) && incoming === "pending") return now;
  return incoming;
}

export function parseMpSignatureHeader(header: string | null): { ts: string; v1: string } | null {
  if (!header) return null;
  const parts = Object.fromEntries(
    header.split(",").map((chunk) => {
      const [key, ...rest] = chunk.trim().split("=");
      return [key, rest.join("=")];
    })
  );
  if (!parts.ts || !parts.v1) return null;
  return { ts: parts.ts, v1: parts.v1 };
}

export function buildMpSignatureManifest(dataId: string, requestId: string, ts: string): string {
  return `id:${dataId};request-id:${requestId};ts:${ts};`;
}

export async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
