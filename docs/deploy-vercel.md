# Deploy a Vercel — CROWFORZA

El build local ya funciona (`npm run build` → `dist/`).

## 1) Login (una sola vez)

En PowerShell, en la carpeta del proyecto:

```powershell
cd "d:\Devs\Pagina web herramientas"
npx vercel login
```

Seguí el link del navegador y autorizá.

## 2) Variables de entorno (obligatorias)

En el dashboard de Vercel (después del primer deploy) o por CLI:

| Name | Value | Environments |
|------|--------|--------------|
| `VITE_SUPABASE_URL` | `https://luzffqsatgtjggbnqcia.supabase.co` | Production, Preview |
| `VITE_SUPABASE_ANON_KEY` | tu anon key (Project Settings → API) | Production, Preview |
| `VITE_ENABLE_MERCADO_PAGO` | `false` | Production, Preview |

Por CLI (reemplazá la anon key):

```powershell
npx vercel env add VITE_SUPABASE_URL production
npx vercel env add VITE_SUPABASE_ANON_KEY production
npx vercel env add VITE_ENABLE_MERCADO_PAGO production
```

O en: Vercel → Project → **Settings → Environment Variables**.

## 3) Deploy producción

```powershell
npx vercel --prod
```

La primera vez responde las preguntas:
- Set up and deploy? **Y**
- Scope: tu cuenta
- Link to existing project? **N** (primera vez)
- Project name: `crowforza` (o el que quieras)
- Directory: `./` (Enter)
- ¿modificar settings? **N** (ya está `vercel.json`)

Al final te da una URL tipo `https://crowforza-xxx.vercel.app`.

## 4) Supabase Auth (después del deploy)

**Dónde:** Supabase → Authentication → **URL Configuration**

- Site URL: `https://TU-PROYECTO.vercel.app`
- Redirect URLs: agregá `https://TU-PROYECTO.vercel.app/**`

## 5) Verificar

1. Abrí la URL de Vercel
2. Catálogo carga (imágenes locales)
3. Login / contacto funcionan con Supabase

## Redeploy

```powershell
npx vercel --prod
```
