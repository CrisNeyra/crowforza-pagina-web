@echo off
REM Arranca n8n con secrets de Supabase (solo local, no subir este archivo con keys).
REM 1) Pegá tu service_role abajo
REM 2) Doble clic o corré: scripts\start-n8n.cmd

set SUPABASE_API_URL=https://luzffqsatgtjggbnqcia.supabase.co
set SUPABASE_SERVICE_ROLE_KEY=PEGA_AQUI_TU_SERVICE_ROLE

cd /d "%~dp0.."
npx n8n
