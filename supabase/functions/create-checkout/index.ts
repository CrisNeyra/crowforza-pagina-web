// Supabase Edge Function — crea preferencia de Mercado Pago
// Deploy: supabase functions deploy create-checkout --no-verify-jwt=false
// Secrets: MP_ACCESS_TOKEN, SITE_URL
//
// Flujo:
// 1) Frontend (usuario autenticado) llama esta function con items del carrito
// 2) Function crea preferencia MP y deja order en status=pending
// 3) Webhook MP (otra function) confirma paid

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckoutItem = {
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
};

type CheckoutBody = {
  customer_name: string;
  payment_method?: string;
  payment_notes?: string;
  items: CheckoutItem[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    const siteUrl = Deno.env.get("SITE_URL") || "http://localhost:3000";
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!mpToken || !supabaseUrl || !serviceKey) {
      return json({ error: "Faltan secrets: MP_ACCESS_TOKEN / SUPABASE_*" }, 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return json({ error: "Sesión inválida" }, 401);
    }

    const body = (await req.json()) as CheckoutBody;
    if (!body?.customer_name || !Array.isArray(body.items) || body.items.length === 0) {
      return json({ error: "Payload inválido" }, 400);
    }

    const total = body.items.reduce(
      (sum, item) => sum + Number(item.unit_price) * Number(item.quantity),
      0
    );
    if (total <= 0) {
      return json({ error: "Total inválido" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        customer_email: user.email,
        customer_id: user.id,
        customer_name: String(body.customer_name).trim().slice(0, 120),
        payment_method: body.payment_method || "mercado_pago",
        payment_notes: body.payment_notes ? String(body.payment_notes).slice(0, 500) : null,
        total_amount: total,
        status: "pending",
        items: body.items,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      return json({ error: orderError?.message || "No se pudo crear el pedido" }, 500);
    }

    const preference = {
      external_reference: order.id,
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook`,
      back_urls: {
        success: `${siteUrl}/?payment=success`,
        failure: `${siteUrl}/?payment=failure`,
        pending: `${siteUrl}/?payment=pending`,
      },
      auto_return: "approved",
      items: body.items.map((item) => ({
        id: String(item.product_id),
        title: item.product_name,
        quantity: Number(item.quantity),
        unit_price: Number(item.unit_price),
        currency_id: "ARS",
      })),
      payer: { email: user.email },
    };

    const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mpToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(preference),
    });

    const mpData = await mpRes.json();
    if (!mpRes.ok) {
      await admin.from("orders").update({ status: "failed" }).eq("id", order.id);
      return json({ error: "Mercado Pago rechazó la preferencia", details: mpData }, 502);
    }

    return json({
      order_id: order.id,
      preference_id: mpData.id,
      init_point: mpData.init_point,
      sandbox_init_point: mpData.sandbox_init_point,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Error interno" }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
