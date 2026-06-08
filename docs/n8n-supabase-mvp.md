# CROWFORZA - MVP n8n + Supabase

## 1) Auditoria del estado actual

- La web es estatica (`index.html`, `js/main.js`) y ya tiene integracion base con Supabase para auth y `orders`.
- Los formularios de contacto/newsletter mostraban toasts pero no persistian datos en backend.
- No habia pipeline de automatizacion (clasificacion IA, respuesta automatica, notificacion interna).

## 2) MVP propuesto (seguro y escalable)

Arquitectura elegida:

1. Frontend inserta datos en Supabase (`contact_messages`, `newsletter_subscribers`, `orders`).
2. Supabase Database Webhooks notifican a n8n cuando hay nuevos registros.
3. n8n:
   - clasifica mensaje (`category`)
   - genera `ai_response` con LLM
   - envia email al cliente y notificacion interna
   - actualiza fila en Supabase (`status`, `ai_response`, `automation_status`).

Seguridad:

- Sin secretos en frontend.
- Solo `SUPABASE_URL` y `SUPABASE_ANON_KEY` publicas.
- API keys de n8n/LLM/email van en credenciales de n8n.
- RLS habilitado en tablas.

## 3) Cambios de codigo aplicados en este repo

- `index.html`
  - Honeypot antispam en:
    - `#contact-form`: `input[name="website"]`
    - `#newsletter-form`: `input[name="company"]`
- `css/styles.css`
  - clase `.honeypot-field` para ocultar campos trampa.
- `js/main.js`
  - Persistencia real de formularios:
    - `persistContactMessage()`
    - `persistNewsletterSubscription()`
  - Antispam basico:
    - honeypot + rate-limit cliente en `localStorage`
    - `checkRateLimit()`
  - Trazabilidad:
    - `source_url`
    - `client_fingerprint`
  - Fallback local si Supabase no esta configurado.
- `supabase/automation_mvp.sql`
  - tablas y politicas para `contact_messages` y `newsletter_subscribers`
  - campos opcionales de automatizacion en `orders`.

## 4) SQL y RLS

Ejecutar en este orden:

1. `supabase/schema.sql`
2. `supabase/automation_mvp.sql`

Nota: las politicas del MVP permiten insert/update anon para newsletter y insert anon para contacto (pensado para sitio publico).

## 5) Configuracion paso a paso (Supabase + n8n + email + LLM)

### A. Supabase

1. En `js/supabase-config.js`, completar:
   - `window.SUPABASE_URL`
   - `window.SUPABASE_ANON_KEY`
2. Ejecutar SQL de `schema.sql` y `automation_mvp.sql`.
3. En Supabase -> Database Webhooks, crear 3 webhooks:
   - `contact_messages` on `INSERT` -> URL webhook n8n (workflow contacto)
   - `newsletter_subscribers` on `INSERT` -> URL webhook n8n (workflow newsletter)
   - `orders` on `INSERT` -> URL webhook n8n (workflow pedidos)

### B. n8n (workflows recomendados)

#### Workflow 1: Contacto IA

Nodos:

1. **Webhook Trigger** (POST desde Supabase webhook)
2. **Set / Function**: normaliza payload
3. **LLM Node** (OpenAI/otro): clasifica + genera respuesta sugerida
4. **Email Node** (SMTP/SendGrid): responde al cliente
5. **Email/Slack Node**: notificacion interna
6. **Supabase Node**: `update contact_messages set status='answered', category=?, ai_response=?`
7. **Error branch**: `status='error'`

#### Workflow 2: Newsletter

Nodos:

1. Webhook Trigger
2. LLM opcional para segmentacion (`ai_segment`)
3. Email bienvenida
4. Supabase update (`status='active'`, `ai_segment=?`)

#### Workflow 3: Pedidos

Nodos:

1. Webhook Trigger
2. Componer resumen del pedido (LLM opcional)
3. Email confirmacion cliente
4. Notificacion interna
5. Supabase update `orders.automation_status='notified'`, `ai_summary=?`

### C. Variables/credenciales en n8n

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (solo en n8n)
- `OPENAI_API_KEY` (o proveedor LLM)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `INTERNAL_ALERT_EMAIL`

## 6) Pruebas (checklist)

### Contacto

- [ ] envio normal crea fila en `contact_messages`
- [ ] webhook llega a n8n
- [ ] n8n clasifica y genera `ai_response`
- [ ] cliente recibe email
- [ ] estado final en Supabase = `answered`
- [ ] honeypot no crea fila
- [ ] rate-limit bloquea spam rapido

### Newsletter

- [ ] email valido inserta/actualiza en `newsletter_subscribers`
- [ ] n8n envia bienvenida
- [ ] actualiza `status` y/o `ai_segment`

### Pedidos

- [ ] al pagar se crea `orders`
- [ ] webhook dispara flujo
- [ ] confirmacion cliente + alerta interna
- [ ] `automation_status='notified'`

### Fallbacks

- [ ] sin Supabase configurado, formularios guardan localmente y no rompen UX
- [ ] errores de n8n dejan trazabilidad en estado `error`

## 7) Siguiente mejora recomendada

Mover inserciones de contacto/newsletter a una **Supabase Edge Function** con captcha (Cloudflare Turnstile o hCaptcha) para anti-spam robusto server-side.
