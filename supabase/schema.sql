-- CROWFORZA - Esquema base para Supabase
-- Ejecutar este script en el SQL Editor de Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    customer_email text,
    customer_name text not null,
    payment_method text not null check (
        payment_method in ('transferencia', 'credito', 'debito', 'efectivo', 'mercado_pago')
    ),
    payment_notes text,
    total_amount numeric(12,2) not null check (total_amount >= 0),
    status text not null default 'paid',
    items jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_customer_email on public.orders (customer_email);

alter table public.orders enable row level security;

-- Permitir lectura/escritura autenticada.
create policy "authenticated_can_insert_orders"
on public.orders
for insert
to authenticated
with check (true);

create policy "authenticated_can_select_orders"
on public.orders
for select
to authenticated
using (true);

-- Si quieres permitir checkout sin login de Supabase Auth, descomenta:
-- create policy "anon_can_insert_orders"
-- on public.orders
-- for insert
-- to anon
-- with check (true);
