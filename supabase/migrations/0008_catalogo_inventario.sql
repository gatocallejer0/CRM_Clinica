-- CRM Clínica — Catálogo e inventario: CRUD de servicios, productos con
-- stock, registro de ventas (descuenta stock automáticamente) y una
-- bitácora de auditoría genérica reusada también por Administración de
-- usuarios.

-- ── products ───────────────────────────────────────────────────────────────
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  unit text not null default 'unidad',
  stock numeric(10, 2) not null default 0 check (stock >= 0),
  price numeric(10, 2),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.products is 'Productos/insumos del inventario. El stock baja automáticamente al registrar una venta (ver create_sale).';

-- ── sales / sale_items ────────────────────────────────────────────────────
-- La venta es independiente del expediente clínico: recepción puede
-- venderle un producto a alguien sin que medie una consulta médica.
-- patient_id es opcional a propósito (venta a alguien no registrado).
create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references public.patients (id) on delete set null,
  sold_by uuid references public.profiles (id) on delete set null,
  sold_by_name text not null,
  total numeric(10, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.sales is 'Ventas de productos del inventario. sold_by_name queda como respaldo si el perfil se elimina.';

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity numeric(10, 2) not null check (quantity > 0),
  unit_price numeric(10, 2) not null default 0,
  subtotal numeric(10, 2) not null default 0
);

comment on table public.sale_items is 'Líneas de una venta. product_name queda como respaldo si el producto se elimina o se renombra después.';

create index if not exists sale_items_sale_id_idx on public.sale_items (sale_id);
create index if not exists sales_patient_id_idx on public.sales (patient_id);

-- ── create_sale ────────────────────────────────────────────────────────────
-- Inserta la venta y sus líneas, y descuenta el stock de cada producto en
-- una sola transacción: si algún producto queda con stock negativo, el
-- check constraint de products.stock revierte toda la función (ninguna
-- línea se aplica a medias). `for update` evita una condición de carrera
-- entre dos ventas simultáneas del mismo producto.
create or replace function public.create_sale(
  p_patient_id uuid,
  p_sold_by uuid,
  p_sold_by_name text,
  p_notes text,
  p_items jsonb
) returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_total numeric(10, 2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_product_name text;
  v_subtotal numeric(10, 2);
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto.';
  end if;

  insert into public.sales (patient_id, sold_by, sold_by_name, total, notes)
  values (p_patient_id, p_sold_by, p_sold_by_name, 0, p_notes)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := (v_item ->> 'product_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    select name into v_product_name from public.products where id = v_product_id for update;
    if v_product_name is null then
      raise exception 'Producto no encontrado.';
    end if;

    update public.products set stock = stock - v_quantity where id = v_product_id;

    v_subtotal := v_quantity * v_unit_price;
    v_total := v_total + v_subtotal;

    insert into public.sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
    values (v_sale_id, v_product_id, v_product_name, v_quantity, v_unit_price, v_subtotal);
  end loop;

  update public.sales set total = v_total where id = v_sale_id;

  return v_sale_id;
end;
$$;

comment on function public.create_sale is 'Registra una venta con sus líneas y descuenta stock atómicamente. Falla completa (rollback) si algún producto no tiene stock suficiente.';

-- ── audit_log ──────────────────────────────────────────────────────────────
-- Bitácora genérica de cambios (quién, cuándo, qué) para cualquier tabla —
-- hoy la usan Catálogo/Inventario y Administración de usuarios. Se escribe
-- desde los server actions (no con triggers): los server actions ya saben
-- qué cambió en términos legibles y quién es la usuaria autenticada, algo
-- que un trigger no puede ver cuando la escritura llega por el cliente
-- admin (service role, sin sesión de usuario en el contexto de la conexión).
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('create', 'update', 'delete')),
  summary text not null,
  performed_by uuid references public.profiles (id) on delete set null,
  performed_by_name text not null,
  created_at timestamptz not null default now()
);

comment on table public.audit_log is 'Bitácora de auditoría genérica (tabla + registro + resumen + quién + cuándo), escrita explícitamente desde los server actions.';

create index if not exists audit_log_record_idx on public.audit_log (table_name, record_id, created_at desc);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.products enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.audit_log enable row level security;

-- Catálogo e inventario es una sección solo-Admin (igual que Administración
-- de usuarios) — una sola policy por tabla cubre lectura y escritura.
create policy "products: admin can manage"
  on public.products for all
  to authenticated
  using (public.has_role(array['Admin']))
  with check (public.has_role(array['Admin']));

create policy "sales: admin can manage"
  on public.sales for all
  to authenticated
  using (public.has_role(array['Admin']))
  with check (public.has_role(array['Admin']));

create policy "sale_items: admin can manage"
  on public.sale_items for all
  to authenticated
  using (public.has_role(array['Admin']))
  with check (public.has_role(array['Admin']));

create policy "audit_log: admin can select"
  on public.audit_log for select
  to authenticated
  using (public.has_role(array['Admin']));

-- services ahora tiene CRUD completo desde Catálogo (antes solo se leía).
create policy "services: admin can insert"
  on public.services for insert
  to authenticated
  with check (public.has_role(array['Admin']));

create policy "services: admin can update"
  on public.services for update
  to authenticated
  using (public.has_role(array['Admin']));
