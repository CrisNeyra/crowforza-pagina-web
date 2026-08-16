# n8n desde cero — CROWFORZA

## ¿Para qué sirve n8n?

**n8n** es una herramienta de **automatización** (como Zapier, pero la podés correr vos).

En CROWFORZA el flujo es:

```text
Usuario envía contacto en la web
        ↓
Supabase guarda la fila (contact_messages)
        ↓
Supabase avisa a n8n (Database Webhook)
        ↓
n8n clasifica el mensaje + genera respuesta
        ↓
n8n actualiza la fila en Supabase (con service_role)
```

### Por qué importa (especialmente en entrevista)

- El **frontend no procesa** el mensaje con “IA” ni manda emails.
- La lógica vive en el **backend/automatización**.
- Usás **service role solo en n8n**, nunca en el browser.
- Mostrás un pipeline real: web → DB → webhook → workflow → update.

Sin n8n, el contacto solo se guarda. Con n8n, el sistema **reacciona solo**.

---

## Instalación desde cero (Windows, sin Docker)

Tenés Node ya. La forma más simple:

### 1) Abrí una terminal **nueva** (dejá `npm run dev` en la otra)

```powershell
cd "d:\Devs\Pagina web herramientas"
npx n8n
```

La primera vez descarga n8n (puede tardar 1–2 min).

### 2) Abrí el panel

Cuando diga que está listo:

[http://localhost:5678](http://localhost:5678)

Creá el usuario owner (email + password locales; es solo en tu PC).

### 3) Dejá esa terminal abierta

Mientras n8n corre, no la cierres. Para parar: `Ctrl+C`.

---

## Siguiente (cuando n8n esté abierto)

1. Variables `SUPABASE_API_URL` + `SUPABASE_SERVICE_ROLE_KEY`
2. Importar `backend/workflows/contact-ai-reply.n8n.json`
3. Activar workflow + copiar URL del webhook
4. Crear Database Webhook en Supabase

Detalle de esos pasos: [`n8n-quickstart.md`](n8n-quickstart.md)

---

## Alternativa con Docker (opcional)

Si más adelante instalás Docker Desktop, en el repo ya hay:

```powershell
cd "d:\Devs\Pagina web herramientas\docker-compose"
docker compose up -d
```

Para la entrevista, `npx n8n` alcanza.
