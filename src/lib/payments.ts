import { supabaseUrl } from "../config";

export type CheckoutRequestItem = {
  product_id: number;
  product_name: string;
  unit_price: number;
  quantity: number;
};

export type CreateCheckoutResponse = {
  order_id: string;
  preference_id: string;
  init_point?: string;
  sandbox_init_point?: string;
  error?: string;
};

/** Llama a la Edge Function create-checkout (Mercado Pago). */
export async function createMercadoPagoCheckout(
  accessToken: string,
  payload: {
    customer_name: string;
    payment_notes?: string;
    items: CheckoutRequestItem[];
  }
): Promise<CreateCheckoutResponse> {
  const endpoint = `${supabaseUrl}/functions/v1/create-checkout`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      ...payload,
      payment_method: "mercado_pago",
    }),
  });

  const data = (await response.json()) as CreateCheckoutResponse;
  if (!response.ok) {
    throw new Error(data.error || "No se pudo iniciar el pago con Mercado Pago");
  }
  return data;
}
