# CROWFORZA

Tienda web de herramientas profesionales — proyecto full-stack listo para demo y portfolio.

**Stack:** Vite · TypeScript · Supabase (Auth, Postgres, RLS, Edge Functions) · n8n · Mercado Pago (scaffold)

---

## Demo en 60 segundos (entrevista)

1. Catálogo + carrito + checkout (pedido queda `pending`; nunca `paid` desde el browser).
2. Auth con Supabase (email).
3. Formulario de contacto → Edge Function `submit-form` (rate limit) → fila en DB → n8n clasifica y responde.
4. Seguridad: RLS por dueño, headers HTTP, sin `service_role` en el frontend.
5. Mercado Pago: código listo (`create-checkout` + `mp-webhook`); flag `VITE_ENABLE_MERCADO_PAGO=false` en demo.

---

## Arranque local

Requisitos: Node.js 20+.

```powershell
npm install
# Copiá .env.example → .env y pegá VITE_SUPABASE_ANON_KEY
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

```powershell
npm test              # unit (Vitest)
npm run test:e2e      # smoke Playwright
npm run build         # producción → dist/
npm run optimize:images
npm run optimize:brands
```

Sin `VITE_SUPABASE_ANON_KEY`, la app corre en **modo local** (localStorage).

---

## Arquitectura

```text
Browser (Vite)
    │  anon key solamente
    ├─► Supabase Auth / orders (RLS)
    ├─► Edge Function submit-form (contacto / newsletter + rate limit)
    └─► Edge Function create-checkout (MP, opcional)
              │
              ▼
         Postgres + RLS
              │ Database Webhook
              ▼
            n8n  ──service_role──► update contact_messages
```

## Supabase

- Project URL: `https://luzffqsatgtjggbnqcia.supabase.co`
- Setup SQL (orden): `schema.sql` → `automation_mvp.sql` → `security_hardening.sql`
- Guía: [`docs/supabase-setup.md`](docs/supabase-setup.md)
- Seguridad: [`docs/security-checklist.md`](docs/security-checklist.md)

## n8n (automatización)

- Desde cero: [`docs/n8n-from-zero.md`](docs/n8n-from-zero.md)
- Quickstart: [`docs/n8n-quickstart.md`](docs/n8n-quickstart.md)
- Workflow: `backend/workflows/contact-ai-reply.n8n.json`

## Estructura del repo

| Ruta | Rol |
|------|-----|
| `index.html` + `src/` | **App principal** (fuente de verdad) |
| `public/assets/` | Imágenes optimizadas (productos, categorías, marcas) |
| `css/` | Estilos |
| `supabase/` | SQL + Edge Functions |
| `backend/workflows/` | Workflows n8n |
| `docs/` | Guías de setup y seguridad |
| `privacy.html` / `terms.html` / `cookies.html` | Legales |
| `tests/` | Unit + e2e |
| `.github/workflows/ci.yml` | CI |
| `web/`, `js/` | **Legacy — no usar** |

## Checkout y pagos

- Offline / demo: pedido `pending`.
- Mercado Pago: activar con `VITE_ENABLE_MERCADO_PAGO=true` + secrets `MP_ACCESS_TOKEN` y deploy de functions.
- `paid` solo vía `mp-webhook` (service role), nunca desde el cliente.

## Deploy (Vercel)

Guía completa: [`docs/deploy-vercel.md`](docs/deploy-vercel.md)

```powershell
npm run build
npx vercel login
npx vercel --prod
```

- Build: `npm run build` · Output: `dist`
- Headers: `vercel.json`
- En Vercel cargá `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Settings → Environment Variables)
- En Supabase Auth, agregá la URL de Vercel en Site URL / Redirect URLs

## Documentación

| Doc | Contenido |
|-----|-----------|
| [`docs/deploy-vercel.md`](docs/deploy-vercel.md) | Deploy a producción |
| [`docs/supabase-setup.md`](docs/supabase-setup.md) | SQL, Auth, Edge Functions |
| [`docs/security-checklist.md`](docs/security-checklist.md) | Checklist seguridad 10/10 |
| [`docs/n8n-from-zero.md`](docs/n8n-from-zero.md) | Qué es n8n + instalación |
| [`docs/n8n-quickstart.md`](docs/n8n-quickstart.md) | Webhook contacto end-to-end |
| [`docs/n8n-supabase-mvp.md`](docs/n8n-supabase-mvp.md) | Arquitectura automatización |
