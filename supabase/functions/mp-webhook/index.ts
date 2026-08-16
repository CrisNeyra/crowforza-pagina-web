// Webhook de Mercado Pago — confirma pagos y marca orders.status = paid
// Deploy: supabase functions deploy mp-webhook
// Secrets: MP_ACCESS_TOKEN, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  try {
    const mpToken = Deno.env.get("MP_ACCESS_TOKEN");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!mpToken || !supabaseUrl || !serviceKey) {
      return new Response("Missing secrets", { status: 500 });
    }

    const url = new URL(req.url);
    const paymentId =
      url.searchParams.get("data.id") ||
      url.searchParams.get("id") ||
      (await req.json().catch(() => ({})))?.data?.id;

    if (!paymentId) {
      return new Response("ignored", { status: 200 });
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

    const statusMap: Record<string, string> = {
      approved: "paid",
      pending: "pending",
      in_process: "pending",
      rejected: "failed",
      cancelled: "cancelled",
      refunded: "refunded",
    };
    const nextStatus = statusMap[payment.status] || "pending";

    const admin = createClient(supabaseUrl, serviceKey);
    const { error } = await admin.from("orders").update({ status: nextStatus }).eq("id", orderId);
    if (error) {
      return new Response(error.message, { status: 500 });
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "error", { status: 500 });
  }
});
