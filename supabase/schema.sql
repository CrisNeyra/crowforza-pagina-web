-- CROWFORZA - Esquema base para Supabase
-- Ejecutar este script en el SQL Editor de Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    customer_email text,
    customer_id uuid,
    customer_name text not null,
    payment_method text not null check (
        payment_method in ('transferencia', 'credito', 'debito', 'efectivo', 'mercado_pago')
    ),
    payment_notes text,
    total_amount numeric(12,2) not null check (total_amount >= 0),
    status text not null default 'pending'
        check (status in ('pending', 'paid', 'cancelled', 'refunded', 'failed')),
    items jsonb not null,
    created_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on public.orders (created_at desc);
create index if not exists idx_orders_customer_email on public.orders (customer_email);

alter table public.orders enable row level security;

-- Cada usuario autenticado solo inserta/lee SUS pedidos (email del JWT).
-- status siempre pending desde el cliente; paid solo vía webhook (service role).
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

-- Sin UPDATE para clientes: el status paid lo confirma mp-webhook con service role.
drop policy if exists "authenticated_can_update_orders" on public.orders;
drop policy if exists "anon_can_update_orders" on public.orders;
drop policy if exists "anon_can_insert_orders" on public.orders;
