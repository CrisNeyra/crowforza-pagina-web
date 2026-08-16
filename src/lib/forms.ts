import { supabaseAnonKey, supabaseUrl } from "../config";

export type SubmitFormPayload =
  | {
      kind: "contact";
      honeypot?: string;
      full_name: string;
      email: string;
      phone?: string | null;
      subject?: string;
      message: string;
      source_url?: string;
      client_fingerprint?: string;
    }
  | {
      kind: "newsletter";
      honeypot?: string;
      email: string;
      source?: string;
      source_url?: string;
      client_fingerprint?: string;
    };

/** Envía formulario vía Edge Function con rate limit server-side. */
export async function submitPublicForm(payload: SubmitFormPayload): Promise<void> {
  const endpoint = `${supabaseUrl}/functions/v1/submit-form`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "No se pudo enviar el formulario");
  }
}
