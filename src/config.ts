const placeholderUrl = "https://TU-PROYECTO.supabase.co";
const placeholderKey = "TU_SUPABASE_ANON_KEY";

function normalizeSupabaseUrl(raw: string | undefined): string {
  const value = String(raw || "").trim().replace(/\/+$/, "");
  if (!value) return placeholderUrl;

  // Errores frecuentes: pegar /rest/v1 o la URL de Vercel.
  try {
    const url = new URL(value.replace(/\/rest\/v1\/?$/i, ""));
    if (!url.hostname.endsWith(".supabase.co")) {
      console.warn(
        "[CROWFORZA] VITE_SUPABASE_URL debe ser https://TU-PROYECTO.supabase.co (no la URL de Vercel)."
      );
      return placeholderUrl;
    }
    return `${url.protocol}//${url.host}`;
  } catch {
    return placeholderUrl;
  }
}

export const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);

export const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || placeholderKey;

export const mercadoPagoPublicKey =
  import.meta.env.VITE_MP_PUBLIC_KEY?.trim() || "";

/** Activar solo cuando create-checkout esté deployado y haya MP_ACCESS_TOKEN. */
export const enableMercadoPago =
  String(import.meta.env.VITE_ENABLE_MERCADO_PAGO || "").toLowerCase() === "true";

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(supabaseUrl) &&
    Boolean(supabaseAnonKey) &&
    supabaseUrl.includes(".supabase.co") &&
    !supabaseUrl.includes("TU-PROYECTO") &&
    !supabaseAnonKey.includes("TU_SUPABASE") &&
    supabaseAnonKey.length > 40
  );
}
