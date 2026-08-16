# n8n — setup rápido (contacto)

Si todavía no tenés n8n instalado, empezá por [`n8n-from-zero.md`](n8n-from-zero.md).

> **Tip:** si reiniciás el túnel Cloudflare (`cloudflared`), la URL cambia. Actualizá el Database Webhook en Supabase con la nueva URL + `/webhook/crowforza-contact`.

Objetivo para la demo: cuando alguien envía el formulario de contacto, n8n clasifica el mensaje y actualiza la fila en Supabase con `service_role`.

## 0) Requisitos

- n8n corriendo (local o cloud)
- Supabase con tablas `contact_messages` y RLS ya aplicados
- Workflow listo en el repo: `backend/workflows/contact-ai-reply.n8n.json`

## 1) Copiar secrets (Supabase Dashboard)

**Dónde:** Project Settings → **API**

Copiá:

| Variable | Qué es |
|----------|--------|
| `SUPABASE_API_URL` | Project URL (`https://luzffqsatgtjggbnqcia.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` (secret) — **nunca** en el frontend |

## 2) Variables en n8n

**Dónde:** n8n → Settings → **Variables** (o Environment Variables en Docker)

Creá:

```text
SUPABASE_API_URL=https://luzffqsatgtjggbnqcia.supabase.co
SUPABASE_SERVICE_ROLE_KEY=pegá_aquí_la_service_role
```

## 3) Importar el workflow

1. n8n → **Workflows** → **Import from File**
2. Elegí: `backend/workflows/contact-ai-reply.n8n.json`
3. Abrí el workflow → activá (**Active**)

## 4) URL del webhook de n8n

En el nodo **Webhook Contact**:

- Path: `crowforza-contact`
- URL típica local: `http://localhost:5678/webhook/crowforza-contact`
- Si usás n8n cloud: la que muestre el nodo (Production URL)

Copiá la **Production URL** del webhook.

## 5) Database Webhook en Supabase

**Dónde:** Supabase → **Database** → **Webhooks** → Create

| Campo | Valor |
|-------|--------|
| Name | `contact_to_n8n` |
| Table | `contact_messages` |
| Events | **Insert** |
| Type | HTTP Request |
| Method | POST |
| URL | la Production URL del paso 4 |
| Timeout | 5000 |

Guardá.

## 6) Probar

1. En la web, enviá un mensaje desde **Contacto**
2. Supabase → Table Editor → `contact_messages`: debe aparecer la fila
3. n8n → **Executions**: debe haber una corrida OK
4. La misma fila debe quedar con `status=answered`, `category=...`, `ai_response=...`

## Si falla

- **n8n no recibe nada:** revisá que el workflow esté Active y la URL del webhook de Supabase sea la de Production (no Test).
- **Update falla 401/403:** `SUPABASE_SERVICE_ROLE_KEY` mal pegada o variable no cargada (reiniciá n8n).
- **Payload vacío:** el webhook de Supabase manda `{ type, table, record, ... }`; el workflow ya lee `$json.record.*`.

## Siguiente (opcional)

- Workflow newsletter (bienvenida)
- Workflow pedidos (aviso interno)
- Nodo Email SMTP para responder al cliente
