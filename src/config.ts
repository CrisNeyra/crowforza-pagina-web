const placeholderUrl = "https://TU-PROYECTO.supabase.co";
const placeholderKey = "TU_SUPABASE_ANON_KEY";

export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL?.trim() || placeholderUrl;

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
    !supabaseUrl.includes("TU-PROYECTO") &&
    !supabaseAnonKey.includes("TU_SUPABASE") &&
    supabaseAnonKey.length > 20
  );
}
