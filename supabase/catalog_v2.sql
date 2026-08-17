-- CROWFORZA — catalog_v2
-- Ejecutar en SQL Editor DESPUÉS de catalog_stock.sql
-- Comentarios con dos guiones (--).

create table if not exists public.categories (
    id text primary key,
    name text not null,
    icon text not null default 'fa-toolbox',
    image text not null,
    sort_order integer not null default 0
);

insert into public.categories (id, name, icon, image, sort_order) values
    ('martillos', 'Martillos', 'fa-hammer', '/assets/categories/martillos.webp', 1),
    ('destornilladores', 'Destornilladores', 'fa-screwdriver', '/assets/categories/destornilladores.webp', 2),
    ('llaves', 'Llaves', 'fa-wrench', '/assets/categories/llaves.webp', 3),
    ('alicates', 'Alicates', 'fa-pliers', '/assets/categories/alicates.webp', 4),
    ('medicion', 'Medición', 'fa-ruler-combined', '/assets/categories/medicion.webp', 5),
    ('sierras', 'Sierras', 'fa-saw', '/assets/categories/sierras.webp', 6)
on conflict (id) do update
set name = excluded.name,
    icon = excluded.icon,
    image = excluded.image,
    sort_order = excluded.sort_order;

alter table public.categories enable row level security;
drop policy if exists "public_select_categories" on public.categories;
create policy "public_select_categories"
on public.categories
for select
to anon, authenticated
using (true);

grant select on public.categories to anon, authenticated;

create table if not exists public.stock_movements (
    id bigint generated always as identity primary key,
    product_id integer not null references public.products (id) on delete cascade,
    delta integer not null,
    reason text not null check (reason in ('order', 'admin', 'mp_rollback')),
    order_id uuid,
    actor_id uuid,
    created_at timestamptz not null default now()
);

alter table public.stock_movements enable row level security;
drop policy if exists "admins_select_stock_movements" on public.stock_movements;
create policy "admins_select_stock_movements"
on public.stock_movements
for select
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

grant select on public.stock_movements to authenticated;
revoke insert, update, delete on public.stock_movements from anon, authenticated, public;

create or replace function public.place_order(
    p_customer_name text,
    p_payment_method text,
    p_payment_notes text,
    p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_email text := auth.jwt() ->> 'email';
    v_total numeric(12, 2) := 0;
    v_order_id uuid;
    v_line jsonb;
    v_pid integer;
    v_qty integer;
    v_name text;
    v_price numeric(12, 2);
    v_stock integer;
    v_quoted jsonb := '[]'::jsonb;
begin
    if v_uid is null or coalesce(v_email, '') = '' then
        raise exception 'Debes iniciar sesion';
    end if;
    if p_customer_name is null or length(trim(p_customer_name)) < 2 then
        raise exception 'Nombre invalido';
    end if;
    if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) = 0 then
        raise exception 'Carrito vacio';
    end if;

    for v_line in select value from jsonb_array_elements(p_items)
    loop
        v_pid := (v_line ->> 'product_id')::integer;
        v_qty := greatest(1, floor(coalesce((v_line ->> 'quantity')::numeric, 0))::integer);

        select name, price, stock
        into v_name, v_price, v_stock
        from public.products
        where id = v_pid and active = true
        for update;

        if not found then
            raise exception 'Producto invalido: %', v_pid;
        end if;
        if v_stock < v_qty then
            raise exception 'Sin stock suficiente: %', v_name;
        end if;

        update public.products
        set stock = stock - v_qty, updated_at = now()
        where id = v_pid;

        v_total := v_total + (v_price * v_qty);
        v_quoted := v_quoted || jsonb_build_array(
            jsonb_build_object(
                'product_id', v_pid,
                'product_name', v_name,
                'unit_price', v_price,
                'quantity', v_qty
            )
        );
    end loop;

    insert into public.orders (
        customer_email,
        customer_id,
        customer_name,
        payment_method,
        payment_notes,
        total_amount,
        status,
        items
    ) values (
        v_email,
        v_uid,
        trim(p_customer_name),
        p_payment_method,
        nullif(trim(coalesce(p_payment_notes, '')), ''),
        v_total,
        'pending',
        v_quoted
    )
    returning id into v_order_id;

    for v_line in select value from jsonb_array_elements(v_quoted)
    loop
        insert into public.stock_movements (product_id, delta, reason, order_id, actor_id)
        values (
            (v_line ->> 'product_id')::integer,
            -((v_line ->> 'quantity')::integer),
            'order',
            v_order_id,
            v_uid
        );
    end loop;

    return v_order_id;
end;
$$;

revoke all on function public.place_order(text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, jsonb) to authenticated;

create or replace function public.cancel_pending_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_order public.orders%rowtype;
    v_line jsonb;
    v_pid integer;
    v_qty integer;
begin
    select * into v_order from public.orders where id = p_order_id for update;
    if not found then
        raise exception 'Pedido inexistente';
    end if;
    if v_uid is null then
        if auth.role() is distinct from 'service_role' then
            raise exception 'No autorizado';
        end if;
    elsif v_order.customer_id is distinct from v_uid then
        raise exception 'No autorizado';
    end if;
    if v_order.status not in ('pending', 'failed') then
        return;
    end if;

    for v_line in select value from jsonb_array_elements(coalesce(v_order.items, '[]'::jsonb))
    loop
        v_pid := (v_line ->> 'product_id')::integer;
        v_qty := greatest(1, floor(coalesce((v_line ->> 'quantity')::numeric, 0))::integer);
        update public.products
        set stock = stock + v_qty, updated_at = now()
        where id = v_pid;
        insert into public.stock_movements (product_id, delta, reason, order_id, actor_id)
        values (v_pid, v_qty, 'mp_rollback', p_order_id, v_uid);
    end loop;

    update public.orders set status = 'failed' where id = p_order_id;
end;
$$;

revoke all on function public.cancel_pending_order(uuid) from public;
grant execute on function public.cancel_pending_order(uuid) to authenticated, service_role;

create or replace function public.admin_set_product(
    p_id integer,
    p_price numeric,
    p_stock integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_old_stock integer;
    v_name text;
begin
    if v_uid is null or not exists (select 1 from public.admins a where a.user_id = v_uid) then
        raise exception 'No autorizado';
    end if;
    if p_price is null or p_price < 0 or p_stock is null or p_stock < 0 then
        raise exception 'Precio o stock invalido';
    end if;

    select stock, name into v_old_stock, v_name
    from public.products
    where id = p_id
    for update;
    if not found then
        raise exception 'Producto inexistente';
    end if;

    update public.products
    set price = p_price, stock = p_stock, updated_at = now()
    where id = p_id;

    if v_old_stock is distinct from p_stock then
        insert into public.stock_movements (product_id, delta, reason, actor_id)
        values (p_id, p_stock - v_old_stock, 'admin', v_uid);
    end if;

    return jsonb_build_object(
        'id', p_id,
        'name', v_name,
        'old_stock', v_old_stock,
        'new_stock', p_stock,
        'price', p_price
    );
end;
$$;

revoke all on function public.admin_set_product(integer, numeric, integer) from public;
grant execute on function public.admin_set_product(integer, numeric, integer) to authenticated;

drop policy if exists "admins_update_products" on public.products;
revoke update on public.products from authenticated;
