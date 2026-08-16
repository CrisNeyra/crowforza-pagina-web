# Checklist de seguridad — CROWFORZA (meta: 10/10)

Ejecutá estos pasos en orden. Lo del repo ya está listo; lo marcado **Manual** lo hacés en el dashboard.

## 1) RLS policies (SQL)

1. Abrí Supabase → **SQL Editor**.
2. Pegá y corré `supabase/security_hardening.sql` (comentarios con `--`, dos guiones).
3. Verificá en **Database → Policies**:
   - `newsletter_subscribers`: solo `INSERT` (sin UPDATE/SELECT de clientes).
   - `contact_messages`: solo `INSERT` (sin SELECT masivo).
   - `orders`: `INSERT`/`SELECT` del dueño; **sin UPDATE** para `anon`/`authenticated`.
   - `form_rate_limits`: RLS on, **sin policies** (solo service role).

## 2) Auth — Confirm email (Manual)

1. Supabase → **Authentication → Providers → Email**.
2. En producción: **Confirm email = ON**.
3. Desactivalo solo para pruebas locales temporales.

## 3) Pagos Mercado Pago (Edge Functions)

```bash
supabase login
supabase link --project-ref luzffqsatgtjggbnqcia
supabase secrets set MP_ACCESS_TOKEN=APP_USR_xxx SITE_URL=https://tu-dominio.com MP_WEBHOOK_SECRET=tu_secret_de_notificaciones
supabase functions deploy create-checkout
supabase functions deploy mp-webhook
supabase functions deploy submit-form --no-verify-jwt
```

- El front, con método **Mercado Pago**, llama `create-checkout`.
- `create-checkout` **revalida precios contra el catálogo del servidor** (`supabase/functions/_shared/catalog.ts`).
- `paid` solo lo marca `mp-webhook` (service role), nunca el browser.
- Secret extra: `MP_WEBHOOK_SECRET` (firma `x-signature` de Mercado Pago). Si falta, el webhook igual consulta el pago en la API de MP.

## 4) n8n — solo service role

En n8n usá **únicamente**:

- `SUPABASE_API_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (nunca en el frontend ni en `VITE_*`)

Los workflows deben hacer `PATCH`/`UPDATE` de `contact_messages`, `newsletter_subscribers` y `orders.automation_*` con esa key.
El workflow de ejemplo (`backend/workflows/contact-ai-reply.n8n.json`) ya usa service role.

## 5) Secretos

| Dónde | Qué |
|-------|-----|
| Frontend / `.env` `VITE_*` | Solo `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, opcional `VITE_MP_PUBLIC_KEY` |
| Edge Function secrets | `MP_ACCESS_TOKEN`, `SITE_URL`, service role (auto) |
| n8n | Service role + LLM + SMTP |

Nunca pegues `service_role` en el HTML, JS o variables `VITE_*`.

## 6) Rate limit server-side

- Cliente: honeypot + `localStorage` (capa UX).
- Servidor: Edge Function `submit-form` + tabla `form_rate_limits` (por IP).
- Deployá `submit-form` (paso 3). Sin deploy, el front hace fallback a insert RLS.

## 7) Headers de seguridad (hosting)

Ya incluidos:

- `vercel.json` (Vercel)
- `netlify.toml` (Netlify)
- `public/_headers` (Cloudflare Pages / Netlify static)
- Headers también en `vite` (dev/preview)

Al deployar, usá HTTPS del proveedor.

## 8) Supabase Security Advisor (Manual)

1. Supabase → **Advisors → Security**.
2. Revisá avisos de RLS / funciones expuestas.
3. Re-corré `security_hardening.sql` si faltan policies.
4. Confirmá que no haya tablas públicas sin RLS.

## Verificación rápida post-deploy

- [ ] Contacto/newsletter insertan filas y resisten spam rápido (429).
- [ ] Usuario A no ve pedidos de usuario B.
- [ ] No se puede `UPDATE orders SET status='paid'` con anon key.
- [ ] Checkout MP crea `pending` y el webhook pasa a `paid`.
- [ ] Headers visibles en DevTools → Network → Response Headers.
