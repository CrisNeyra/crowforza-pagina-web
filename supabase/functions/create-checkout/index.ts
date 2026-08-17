import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type CheckoutItem = {
  product_id: number;
  quantity: number;
};

type CheckoutBody = {
  customer_name: string;
  payment_method?: string;
  payment_notes?: string;
  items: CheckoutItem[];
};

type QuotedLine = {
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
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

    const { data: orderId, error: rpcError } = await userClient.rpc("place_order", {
      p_customer_name: String(body.customer_name).trim().slice(0, 120),
      p_payment_method: body.payment_method || "mercado_pago",
      p_payment_notes: body.payment_notes ? String(body.payment_notes).slice(0, 500) : null,
      p_items: body.items.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Math.max(1, Math.floor(Number(item.quantity) || 0)),
      })),
    });

    if (rpcError || !orderId) {
      const message = rpcError?.message || "No se pudo crear el pedido";
      const status = /stock/i.test(message) ? 409 : 400;
      return json({ error: message }, status);
    }

    const { data: order, error: orderError } = await userClient
      .from("orders")
      .select("id, items, total_amount")
      .eq("id", orderId)
      .single();

    const items = (order?.items || []) as QuotedLine[];
    if (orderError || !items.length) {
      await userClient.rpc("cancel_pending_order", { p_order_id: orderId });
      return json({ error: orderError?.message || "Pedido sin ítems" }, 500);
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
      items: items.map((item) => ({
        id: String(item.product_id),
        title: item.product_name,
        quantity: item.quantity,
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
      await userClient.rpc("cancel_pending_order", { p_order_id: order.id });
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
