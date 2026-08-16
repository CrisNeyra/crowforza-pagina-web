// Webhook de Mercado Pago — confirma pagos y marca orders.status = paid
// Deploy: supabase functions deploy mp-webhook
// Secrets: MP_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, MP_WEBHOOK_SECRET

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const STATUS_MAP: Record<string, string> = {
  approved: "paid",
  pending: "pending",
  in_process: "pending",
  rejected: "failed",
  cancelled: "cancelled",
  refunded: "refunded",
};

const TERMINAL = new Set(["paid", "cancelled", "refunded", "failed"]);

function nextStatus(current: string | null | undefined, incoming: string): string {
  const now = current || "pending";
  if (now === "paid" && incoming !== "refunded") return "paid";
  if (TERMINAL.has(now) && incoming === "pending") return now;
  return incoming;
}

function parseSignature(header: string | null): { ts: string; v1: string } | null {
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

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
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

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function verifyMpSignature(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) {
    console.warn("mp-webhook: MP_WEBHOOK_SECRET no configurado; se valida el pago contra la API de MP");
    return true;
  }
  const parsed = parseSignature(req.headers.get("x-signature"));
  const requestId = req.headers.get("x-request-id") || "";
  if (!parsed || !requestId) return false;
  const manifest = `id:${dataId};request-id:${requestId};ts:${parsed.ts};`;
  const expected = await hmacSha256Hex(secret, manifest);
  return timingSafeEqualHex(expected, parsed.v1.toLowerCase());
}

Deno.serve(async (req) => {
  try {
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!mpToken || !supabaseUrl || !serviceKey) {
      return new Response("Missing secrets", { status: 500 });
    }

    const url = new URL(req.url);
    const cloned = req.clone();
    const body = (await cloned.json().catch(() => ({}))) as { data?: { id?: string }; id?: string };
    const paymentId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      body?.data?.id ||
      body?.id;

    if (!paymentId) {
      return new Response("ignored", { status: 200 });
    }

    const signed = await verifyMpSignature(req, String(paymentId));
    if (!signed) {
      return new Response("invalid signature", { status: 401 });
    }

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${mpToken}` },
    });
    const payment = await paymentRes.json();
    if (!paymentRes.ok) {
      return new Response("payment fetch failed", { status: 502 });
    }

    const orderId = payment.external_reference;
    if (!orderId) {
      return new Response("no external_reference", { status: 200 });
    }

    const incoming = STATUS_MAP[payment.status] || "pending";
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: existing, error: readError } = await admin
      .from("orders")
      .select("id, status")
      .eq("id", orderId)
      .maybeSingle();

    if (readError) {
      return new Response(readError.message, { status: 500 });
    }
    if (!existing) {
      return new Response("order not found", { status: 200 });
    }

    const next = nextStatus(existing.status, incoming);
    if (next === existing.status) {
      return new Response("ok", { status: 200 });
    }

    const { error } = await admin.from("orders").update({ status: next }).eq("id", orderId);
    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "error", { status: 500 });
  }
});
