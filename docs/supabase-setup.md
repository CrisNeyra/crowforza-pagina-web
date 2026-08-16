# Setup Supabase — CROWFORZA

Proyecto Supabase (nombre sugerido en dashboard: **CROWFORZA**).
Project URL: `https://luzffqsatgtjggbnqcia.supabase.co`


Checklist completo de seguridad: [`docs/security-checklist.md`](security-checklist.md)

## 1) Clave anónima

1. Supabase → **Project Settings** → **API**
2. Copiá **Project URL** (ya está en `.env`)
3. Copiá **anon public** → pegala en `.env` como `VITE_SUPABASE_ANON_KEY=...`
4. Reiniciá `npm run dev`

Nunca pegues la **service_role** en el frontend ni en variables `VITE_*`.

## 2) SQL (orden)

En **SQL Editor**, ejecutá en este orden:

1. `supabase/schema.sql`
2. `supabase/automation_mvp.sql`
3. `supabase/security_hardening.sql` ← obligatorio para el hardening actual
4. `supabase/catalog_stock.sql` ← catálogo, stock, RPC `place_order` y tabla `admins`

Los comentarios SQL usan **dos** guiones (`--`). Si ves `syntax error at or near "-"`, te faltó un guión al pegar.

## 3) Auth

En **Authentication → Providers**, dejá Email habilitado.
En **producción** dejá **Confirm email** activado.
Para pruebas locales podés desactivarlo temporalmente.

Para el panel **Inventario**: Authentication → Users → copiá el UUID → SQL Editor:

```sql
insert into public.admins (user_id) values ('TU-UUID')
on conflict (user_id) do nothing;
```

## 4) Mercado Pago + formularios (Edge Functions)

```bash
# Supabase CLI logueado al proyecto
supabase secrets set MP_ACCESS_TOKEN=APP_USR_xxx SITE_URL=http://localhost:3000
supabase functions deploy create-checkout
supabase functions deploy mp-webhook
supabase functions deploy submit-form --no-verify-jwt
```

Flujo de pago:

1. Front (método Mercado Pago) → `create-checkout` (crea order `pending` + preferencia MP).
2. Usuario paga en MP.
3. `mp-webhook` confirma y marca `paid` con service role.

Flujo de formularios:

1. Front → `submit-form` (rate limit por IP + honeypot).
2. Insert controlado con service role.
3. Si la function no está deployada, hay fallback a insert RLS.
