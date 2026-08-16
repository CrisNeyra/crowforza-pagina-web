-- CROWFORZA — catálogo + stock
-- Ejecutar en SQL Editor DESPUÉS de schema.sql / automation_mvp.sql / security_hardening.sql
-- Comentarios con dos guiones (--).

create table if not exists public.products (
    id integer primary key,
    name text not null,
    category text not null,
    price numeric(12, 2) not null check (price >= 0),
    old_price numeric(12, 2),
    image text not null,
    rating numeric(3, 2) not null default 0,
    reviews integer not null default 0,
    badge text check (badge is null or badge in ('sale', 'new', 'hot')),
    description text not null default '',
    stock integer not null default 0 check (stock >= 0),
    featured boolean not null default false,
    active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.admins (
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

insert into public.products (
    id, name, category, price, old_price, image, rating, reviews, badge, description, stock, featured, active
) values
(
    1, 'Martillo de Carpintero Stanley Pro', 'martillos', 31490, 41990,
    '/assets/products/martillo-stanley.webp', 4.8, 156, 'sale',
    'Martillo de carpintero profesional con mango ergonómico de fibra de vidrio y cabeza de acero forjado. Peso: 450g.',
    24, true, true
),
(
    2, 'Martillo Demoledor Cat DX29 14,9kg 50J 1750W', 'martillos', 36200, null,
    '/assets/products/martillo-demoledor-cat.webp', 4.6, 89, 'new',
    'Maza De Acero 1.5kg Cabo Fibra Certificadas',
    8, false, true
),
(
    3, 'Maza de Goma Profesional', 'martillos', 19900, null,
    '/assets/products/maza-goma.webp', 4.5, 67, null,
    'Maza de goma negra para trabajos delicados. No daña superficies.',
    18, false, true
),
(
    4, 'Set Destornilladores Precision 12 pzas', 'destornilladores', 26200, 34600,
    '/assets/products/set-precision-12.webp', 4.7, 312, 'sale',
    'Set completo de destornilladores de precisión para electrónica. Incluye puntas intercambiables.',
    30, true, true
),
(
    5, 'Juego de 119 pcs destornilladores profesionales magnéticos con soporte organizador.', 'destornilladores', 94500, null,
    '/assets/products/set-destornilladores-119.webp', 4.9, 445, 'hot',
    'KIT COMPLETO: Juego de destornilladores de 119 piezas.',
    12, true, true
),
(
    6, 'Set Destornilladores Phillips 6 pzas', 'destornilladores', 20990, 26200,
    '/assets/products/set-phillips-6.webp', 4.6, 156, 'new',
    'Juego de destornilladores Phillips en varios tamaños. Puntas templadas.',
    22, false, true
),
(
    7, 'Juego De Llaves Combinadas 6 A 19 Mm 12 Piezas', 'llaves', 62990, 83990,
    '/assets/products/llaves-combinadas-12.webp', 4.8, 289, 'sale',
    'Composición Set: 6; 7; 8; 9; 10; 11; 12; 13; 14; 17; 19; 22 mm',
    15, true, true
),
(
    8, 'Llave Inglesa Ajustable 10"', 'llaves', 23600, null,
    '/assets/products/llave-inglesa-10.webp', 4.7, 198, 'hot',
    'Llave inglesa ajustable de 10 pulgadas. Apertura máxima 30mm.',
    20, true, true
),
(
    9, 'Set Llaves Allen Hexagonales', 'llaves', 16800, null,
    '/assets/products/llaves-allen.webp', 4.5, 134, null,
    'Juego de llaves Allen de 1.5 a 10mm con soporte plegable.',
    28, false, true
),
(
    10, 'Alicates Tope de gama', 'alicates', 45100, null,
    '/assets/products/alicates-tope.webp', 4.9, 367, 'hot',
    'Alicates universales alemanes de alta calidad. Corte lateral integrado.',
    10, true, true
),
(
    11, 'Alicates de Corte Diagonal', 'alicates', 19900, 25200,
    '/assets/products/alicates-corte.webp', 4.6, 145, 'sale',
    'Alicates de corte diagonal para cables y alambres. Filos inductivos.',
    16, false, true
),
(
    12, 'Alicates de Punta Larga', 'alicates', 17300, null,
    '/assets/products/alicates-punta.webp', 4.5, 98, null,
    'Alicates de punta de cadena multiusos para doblar láminas de metal y alambre.',
    19, false, true
),
(
    13, 'Cinta Métrica 5m', 'medicion', 13600, null,
    '/assets/products/cinta-metrica-5m.webp', 4.7, 423, 'hot',
    'Cinta métrica de 5 metros con carcasa resistente a golpes.',
    40, true, true
),
(
    14, 'Nivel de Burbuja 60cm', 'medicion', 30400, 37800,
    '/assets/products/nivel-burbuja-60.webp', 4.6, 178, 'sale',
    'Perfil de aluminio con imanes para fijar en elementos metálicos.',
    14, false, true
),
(
    15, 'Calibre Digital de Precisión', 'medicion', 47250, null,
    '/assets/products/calibre-digital.webp', 4.8, 267, 'new',
    'Calibrador digital para diámetro exterior, interior, paso y profundidad.',
    11, true, true
),
(
    16, 'Sierra de Mano Universal', 'sierras', 26200, 31500,
    '/assets/products/sierra-mano-universal.webp', 4.6, 156, 'sale',
    'Juego de sierra de mano de 13 piezas con hojas y estuche rígido.',
    17, false, true
),
(
    17, 'Serrucho Profesional 22"', 'sierras', 34100, null,
    '/assets/products/serrucho-22.webp', 4.7, 134, 'hot',
    'Serrucho de 22 pulgadas para madera y PVC. 7 dientes por pulgada.',
    13, true, true
),
(
    18, 'Sierra Caladora Inalámbrica', 'sierras', 19900, null,
    '/assets/products/sierra-caladora.webp', 4.4, 67, null,
    'Sierra de calar para cortes curvos. Marco de acero reforzado.',
    21, false, true
)
on conflict (id) do nothing;

alter table public.products enable row level security;
alter table public.admins enable row level security;

drop policy if exists "public_select_active_products" on public.products;
create policy "public_select_active_products"
on public.products
for select
to anon, authenticated
using (active = true);

drop policy if exists "admins_select_all_products" on public.products;
create policy "admins_select_all_products"
on public.products
for select
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "admins_update_products" on public.products;
create policy "admins_update_products"
on public.products
for update
to authenticated
using (exists (select 1 from public.admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.admins a where a.user_id = auth.uid()));

drop policy if exists "admin_read_self" on public.admins;
create policy "admin_read_self"
on public.admins
for select
to authenticated
using (user_id = auth.uid());

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

    return v_order_id;
end;
$$;

revoke all on function public.place_order(text, text, text, jsonb) from public;
grant execute on function public.place_order(text, text, text, jsonb) to authenticated;
grant select on public.products to anon, authenticated;
grant update on public.products to authenticated;
grant select on public.admins to authenticated;

-- Para ser admin (reemplazá el UUID por Authentication → Users → tu usuario):
-- insert into public.admins (user_id) values ('00000000-0000-0000-0000-000000000000')
-- on conflict (user_id) do nothing;
