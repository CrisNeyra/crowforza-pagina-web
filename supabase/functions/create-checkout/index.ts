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

    const admin = createClient(supabaseUrl, serviceKey);
    const ids = body.items.map((item) => Number(item.product_id));
    const { data: rows, error: catalogError } = await admin
      .from("products")
      .select("id, name, price, stock, active")
      .in("id", ids);

    if (catalogError || !rows?.length) {
      return json({ error: catalogError?.message || "Catálogo no disponible" }, 400);
    }

    const byId = new Map(rows.map((row) => [Number(row.id), row]));
    const items = [];
    let total = 0;
    for (const line of body.items) {
      const product = byId.get(Number(line.product_id));
      const quantity = Math.max(1, Math.floor(Number(line.quantity) || 0));
      if (!product || product.active === false) {
        return json({ error: `Producto inválido: ${line.product_id}` }, 400);
      }
      if (Number(product.stock) < quantity) {
        return json({ error: `Sin stock suficiente: ${product.name}` }, 409);
      }
      const unitPrice = Number(product.price);
      items.push({
        product_id: Number(product.id),
        product_name: product.name,
        unit_price: unitPrice,
        quantity,
      });
      total += unitPrice * quantity;
    }
    if (total <= 0) {
      return json({ error: "Total inválido" }, 400);
    }

    for (const item of items) {
      const product = byId.get(item.product_id);
      const nextStock = Number(product?.stock) - item.quantity;
      const { error: stockError } = await admin
        .from("products")
        .update({ stock: nextStock, updated_at: new Date().toISOString() })
        .eq("id", item.product_id)
        .gte("stock", item.quantity);
      if (stockError) {
        return json({ error: stockError.message || "No se pudo reservar stock" }, 409);
      }
    }

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
        items,
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
      items: items.map((item) => ({
        id: String(item.product_id),
        title: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
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
      for (const item of items) {
        const product = byId.get(item.product_id);
        await admin
          .from("products")
          .update({ stock: Number(product?.stock), updated_at: new Date().toISOString() })
          .eq("id", item.product_id);
      }
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
