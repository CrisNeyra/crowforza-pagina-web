# Demo CROWFORZA — guion 60 segundos (entrevista)

Sitio: https://crowforza-pagina-web.vercel.app

## Qué decir (texto corto)

> “Es una tienda full-stack de demo: Vite + TypeScript en el front, Supabase con Auth, Postgres y RLS, Edge Functions para formularios con rate limit, y n8n para automatizar respuestas de contacto. Los pedidos quedan `pending`; el `paid` nunca lo marca el browser, solo un webhook de servidor. Mercado Pago está cableado en código pero desactivado en la demo.”

## Recorrido en pantalla (60s)

| Segundos | Qué mostrar | Dónde hacer clic |
|----------|-------------|------------------|
| 0–10 | Home + marcas locales | Abrí el sitio → scroll leve del hero |
| 10–20 | Catálogo rápido | **Catálogo** → filtrá una categoría → abrí un producto |
| 20–35 | Carrito + checkout | **Añadir** → ícono carrito → **Pagar** (si pide login, registrate) |
| 35–45 | Auth real | Menú **Ingresar** → registro/login con Supabase |
| 45–55 | Contacto + backend | **Contacto** → enviá un mensaje → Table Editor en Supabase (opcional) |
| 55–60 | Seguridad / legales | Footer → **Privacidad** → mencioná RLS + headers en Vercel |

## Frases técnicas listas (si preguntan)

- **RLS:** “Cada usuario solo ve sus pedidos; newsletter/contacto son insert-only desde el cliente.”
- **n8n:** “Un Database Webhook dispara el workflow; updates van con service role, nunca en el front.”
- **MP:** “`create-checkout` + `mp-webhook`; flag `VITE_ENABLE_MERCADO_PAGO=false` en demo.”
- **Deploy:** “Vercel + env `VITE_SUPABASE_*` + Auth redirect al dominio.”

## Checklist 2 minutos antes de la entrevista

1. Abrí https://crowforza-pagina-web.vercel.app (Ctrl+F5).
2. Probá login con un usuario que ya confirmaste.
3. Probá un contacto (que no falle el toast).
4. Tené abierto el repo GitHub por si pedís código.
5. En Supabase, el proyecto puede figurar como **CROWFORZA** (solo nombre visible; la URL `luzffqsatgtjggbnqcia` no cambia).
