// Edge Function — formularios públicos con rate limit server-side
// Deploy: supabase functions deploy submit-form --no-verify-jwt
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (inyectados por defecto en Edge)
//
// Flujo:
// 1) Frontend envía contact | newsletter (+ honeypot)
// 2) Function limita por IP + tipo
// 3) Inserta con service role (bypassa RLS de forma controlada)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LIMITS: Record<string, { max: number; windowMs: number }> = {
  contact: { max: 3, windowMs: 10 * 60 * 1000 },
  newsletter: { max: 5, windowMs: 10 * 60 * 1000 },
};

type FormBody = {
  kind: "contact" | "newsletter";
  honeypot?: string;
  full_name?: string;
  email?: string;
  phone?: string | null;
  subject?: string;
  message?: string;
  source?: string;
  source_url?: string;
  client_fingerprint?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return json({ error: "Missing Supabase secrets" }, 500);
    }

    const body = (await req.json()) as FormBody;
    if (body?.honeypot && String(body.honeypot).trim()) {
      // Bot: respuesta OK sin persistir
      return json({ ok: true }, 200);
    }

    if (body?.kind !== "contact" && body?.kind !== "newsletter") {
      return json({ error: "kind inválido" }, 400);
    }

    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Email inválido" }, 400);
    }

    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const admin = createClient(supabaseUrl, serviceKey);
    const allowed = await consumeRateLimit(admin, `${body.kind}:${ip}`, LIMITS[body.kind]);
    if (!allowed) {
      return json({ error: "Demasiados envíos. Probá más tarde." }, 429);
    }

    if (body.kind === "contact") {
      const fullName = String(body.full_name || "").trim();
      const message = String(body.message || "").trim();
      if (fullName.length < 2 || message.length < 5 || message.length > 5000) {
        return json({ error: "Datos de contacto inválidos" }, 400);
      }

      const { error } = await admin.from("contact_messages").insert({
        full_name: fullName,
        email,
        phone: body.phone || null,
        subject: body.subject || "consulta",
        message,
        source_url: body.source_url || null,
        client_fingerprint: body.client_fingerprint || null,
        status: "new",
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    const { error } = await admin.from("newsletter_subscribers").upsert(
      {
        email,
        source: body.source || "newsletter_main",
        source_url: body.source_url || null,
        client_fingerprint: body.client_fingerprint || null,
        status: "active",
      },
      { onConflict: "email" }
    );
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});

async function consumeRateLimit(
  admin: ReturnType<typeof createClient>,
  bucketKey: string,
  limit: { max: number; windowMs: number }
): Promise<boolean> {
  const now = Date.now();
  const { data: row } = await admin
    .from("form_rate_limits")
    .select("bucket_key, window_start, hit_count")
    .eq("bucket_key", bucketKey)
    .maybeSingle();

  if (!row) {
    const { error } = await admin.from("form_rate_limits").insert({
      bucket_key: bucketKey,
      window_start: new Date(now).toISOString(),
      hit_count: 1,
      updated_at: new Date(now).toISOString(),
    });
    return !error;
  }

  const windowStart = new Date(row.window_start).getTime();
  if (now - windowStart > limit.windowMs) {
    const { error } = await admin
      .from("form_rate_limits")
      .update({
        window_start: new Date(now).toISOString(),
        hit_count: 1,
        updated_at: new Date(now).toISOString(),
      })
      .eq("bucket_key", bucketKey);
    return !error;
  }

  if (row.hit_count >= limit.max) return false;

  const { error } = await admin
    .from("form_rate_limits")
    .update({
      hit_count: row.hit_count + 1,
      updated_at: new Date(now).toISOString(),
    })
    .eq("bucket_key", bucketKey);
  return !error;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
