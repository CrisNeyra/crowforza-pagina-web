-- CROWFORZA - MVP n8n + Supabase automation schema
-- Ejecutar en Supabase SQL Editor luego de schema.sql

create extension if not exists "pgcrypto";

-- ===============================
-- CONTACT MESSAGES
-- ===============================
create table if not exists public.contact_messages (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    email text not null,
    phone text,
    subject text not null default 'consulta',
    message text not null,
    source_url text,
    client_fingerprint text,
    status text not null default 'new'
        check (status in ('new', 'processing', 'answered', 'closed', 'error')),
    category text,
    ai_response text,
    internal_notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_contact_messages_status_created
    on public.contact_messages (status, created_at desc);
create index if not exists idx_contact_messages_email
    on public.contact_messages (email);

alter table public.contact_messages enable row level security;

drop policy if exists "anon_insert_contact_messages" on public.contact_messages;
create policy "anon_insert_contact_messages"
on public.contact_messages
for insert
to anon, authenticated
with check (true);

drop policy if exists "authenticated_select_contact_messages" on public.contact_messages;
create policy "authenticated_select_contact_messages"
on public.contact_messages
for select
to authenticated
using (true);

-- ===============================
-- NEWSLETTER SUBSCRIBERS
-- ===============================
create table if not exists public.newsletter_subscribers (
    id uuid primary key default gen_random_uuid(),
    email text not null unique,
    source text not null default 'newsletter_main',
    source_url text,
    client_fingerprint text,
    status text not null default 'active'
        check (status in ('active', 'unsubscribed', 'bounced')),
    ai_segment text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_newsletter_status_created
    on public.newsletter_subscribers (status, created_at desc);

alter table public.newsletter_subscribers enable row level security;

drop policy if exists "anon_upsert_newsletter_subscribers" on public.newsletter_subscribers;
create policy "anon_insert_newsletter_subscribers"
on public.newsletter_subscribers
for insert
to anon, authenticated
with check (true);

drop policy if exists "anon_update_newsletter_subscribers" on public.newsletter_subscribers;
create policy "anon_update_newsletter_subscribers"
on public.newsletter_subscribers
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "authenticated_select_newsletter_subscribers" on public.newsletter_subscribers;
create policy "authenticated_select_newsletter_subscribers"
on public.newsletter_subscribers
for select
to authenticated
using (true);

-- ===============================
-- ORDERS: campos opcionales para estado IA
-- ===============================
alter table public.orders
    add column if not exists ai_summary text,
    add column if not exists automation_status text default 'new'
        check (automation_status in ('new', 'processing', 'notified', 'error'));

create index if not exists idx_orders_automation_status
    on public.orders (automation_status, created_at desc);
