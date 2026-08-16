-- CROWFORZA - Hardening de seguridad (idempotente)
-- Ejecutar en Supabase SQL Editor si ya corriste automation_mvp.sql antes.
-- Nota: los comentarios SQL llevan DOS guiones (--), no uno solo.

-- ===============================
-- 1) Newsletter: sin UPDATE/SELECT desde el cliente
-- ===============================
drop policy if exists "anon_update_newsletter_subscribers" on public.newsletter_subscribers;
drop policy if exists "anon_upsert_newsletter_subscribers" on public.newsletter_subscribers;
drop policy if exists "authenticated_select_newsletter_subscribers" on public.newsletter_subscribers;
drop policy if exists "authenticated_update_newsletter_subscribers" on public.newsletter_subscribers;

-- Solo INSERT público; lecturas/updates vía service role (n8n / Edge Functions / Dashboard)
drop policy if exists "anon_insert_newsletter_subscribers" on public.newsletter_subscribers;
create policy "anon_insert_newsletter_subscribers"
on public.newsletter_subscribers
for insert
to anon, authenticated
with check (
    email is not null
    and length(trim(email)) >= 5
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
);

-- ===============================
-- 2) Contacto: sin SELECT masivo (cualquier usuario autenticado no debe listar mensajes)
-- ===============================
drop policy if exists "authenticated_select_contact_messages" on public.contact_messages;
drop policy if exists "authenticated_update_contact_messages" on public.contact_messages;
drop policy if exists "anon_update_contact_messages" on public.contact_messages;

drop policy if exists "anon_insert_contact_messages" on public.contact_messages;
create policy "anon_insert_contact_messages"
on public.contact_messages
for insert
to anon, authenticated
with check (
    full_name is not null
    and length(trim(full_name)) >= 2
    and email is not null
    and email ~* '^[^@]+@[^@]+\.[^@]+$'
    and message is not null
    and length(trim(message)) >= 5
    and length(message) <= 5000
);

-- ===============================
-- 3) Pedidos: default pending + estados válidos
-- ===============================
alter table public.orders
    alter column status set default 'pending';

do $$
begin
    if not exists (
        select 1
        from pg_constraint
        where conname = 'orders_status_check'
          and conrelid = 'public.orders'::regclass
    ) then
        alter table public.orders
            add constraint orders_status_check
            check (status in ('pending', 'paid', 'cancelled', 'refunded', 'failed'));
    end if;
exception
    when duplicate_object then null;
end $$;

alter table public.orders
    add column if not exists customer_id uuid;

-- El cliente NUNCA puede UPDATE status (paid solo vía webhook / service role)
drop policy if exists "authenticated_can_update_orders" on public.orders;
drop policy if exists "anon_can_update_orders" on public.orders;
drop policy if exists "anon_can_insert_orders" on public.orders;

drop policy if exists "authenticated_can_insert_orders" on public.orders;
create policy "authenticated_can_insert_orders"
on public.orders
for insert
to authenticated
with check (
    customer_email is not null
    and customer_email = (auth.jwt() ->> 'email')
    and (customer_id is null or customer_id = auth.uid())
    and status = 'pending'
);

drop policy if exists "authenticated_can_select_orders" on public.orders;
create policy "authenticated_can_select_orders"
on public.orders
for select
to authenticated
using (
    customer_email = (auth.jwt() ->> 'email')
    or customer_id = auth.uid()
);

-- ===============================
-- 4) Rate limit server-side (tabla solo service role)
-- ===============================
create table if not exists public.form_rate_limits (
    bucket_key text primary key,
    window_start timestamptz not null default now(),
    hit_count integer not null default 0,
    updated_at timestamptz not null default now()
);

alter table public.form_rate_limits enable row level security;
-- Sin policies: anon/authenticated no pueden leer ni escribir.
-- Edge Function submit-form usa service role.

revoke all on table public.form_rate_limits from anon, authenticated;
revoke all on table public.contact_messages from anon, authenticated;
revoke all on table public.newsletter_subscribers from anon, authenticated;
revoke all on table public.orders from anon, authenticated;

grant insert on table public.contact_messages to anon, authenticated;
grant insert on table public.newsletter_subscribers to anon, authenticated;
grant select, insert on table public.orders to authenticated;

-- ===============================
-- 5) Advisor: fijar search_path en funciones propias (si existen)
-- ===============================
do $$
declare
    r record;
begin
    for r in
        select n.nspname as schema_name, p.proname as func_name, pg_get_function_identity_arguments(p.oid) as args
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.proname like 'crowforza%'
    loop
        execute format(
            'alter function %I.%I(%s) set search_path = public',
            r.schema_name, r.func_name, r.args
        );
    end loop;
end $$;

-- ===============================
-- 6) Verificación rápida (opcional: corré el SELECT para auditar)
-- ===============================
-- select schemaname, tablename, policyname, roles, cmd, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
--   and tablename in ('orders', 'contact_messages', 'newsletter_subscribers', 'form_rate_limits')
-- order by tablename, cmd, policyname;
