-- Módulo Cobros y Pagos: permite vender también servicios (no solo
-- productos) y abre el acceso a Recepción, que es quien normalmente cobra
-- en el mostrador. La venta sigue ligada solo a la paciente (no a una cita
-- puntual de la agenda), como ya funcionaba.

-- ── sale_items: agregar service_id ────────────────────────────────────────
alter table public.sale_items
  add column if not exists service_id uuid references public.services (id) on delete set null;

-- Cada línea es de un producto O de un servicio, nunca ambos ni ninguno.
-- Las filas existentes ya cumplen esto (todas tienen product_id).
alter table public.sale_items
  add constraint sale_items_product_or_service_check
  check ((product_id is not null) <> (service_id is not null));

comment on column public.sale_items.service_id is 'Servicio vendido (alternativo a product_id). product_name se reusa como snapshot del nombre en ambos casos.';

-- ── create_sale: acepta líneas de producto o de servicio ──────────────────
-- security definer: Recepción no tiene (ni necesita) permisos de escritura
-- directos sobre products/sales/sale_items — la función corre con los
-- privilegios de quien la creó, igual que register_patient, para que
-- Recepción pueda completar una venta sin exponerle el CRUD de inventario.
create or replace function public.create_sale(
  p_patient_id uuid,
  p_sold_by uuid,
  p_sold_by_name text,
  p_notes text,
  p_items jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_total numeric(10, 2) := 0;
  v_item jsonb;
  v_product_id uuid;
  v_service_id uuid;
  v_quantity numeric(10, 2);
  v_unit_price numeric(10, 2);
  v_item_name text;
  v_subtotal numeric(10, 2);
  v_stock numeric(10, 2);
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta debe tener al menos un producto o servicio.';
  end if;

  insert into public.sales (patient_id, sold_by, sold_by_name, total, notes)
  values (p_patient_id, p_sold_by, p_sold_by_name, 0, p_notes)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(v_item ->> 'product_id', '')::uuid;
    v_service_id := nullif(v_item ->> 'service_id', '')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unit_price')::numeric;

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Cantidad inválida.';
    end if;

    if v_product_id is not null then
      select name, stock into v_item_name, v_stock
      from public.products where id = v_product_id
      for update;

      if v_item_name is null then
        raise exception 'Producto no encontrado.';
      end if;
      if v_stock < v_quantity then
        raise exception 'stock_check: Stock insuficiente para %', v_item_name;
      end if;

      update public.products set stock = stock - v_quantity where id = v_product_id;

      v_subtotal := v_quantity * v_unit_price;
      insert into public.sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
      values (v_sale_id, v_product_id, v_item_name, v_quantity, v_unit_price, v_subtotal);

    elsif v_service_id is not null then
      select name into v_item_name from public.services where id = v_service_id;
      if v_item_name is null then
        raise exception 'Servicio no encontrado.';
      end if;

      v_subtotal := v_quantity * v_unit_price;
      insert into public.sale_items (sale_id, service_id, product_name, quantity, unit_price, subtotal)
      values (v_sale_id, v_service_id, v_item_name, v_quantity, v_unit_price, v_subtotal);
    else
      raise exception 'Cada línea debe tener un producto o un servicio.';
    end if;

    v_total := v_total + v_subtotal;
  end loop;

  update public.sales set total = v_total where id = v_sale_id;

  return v_sale_id;
end;
$$;

comment on function public.create_sale is 'Registra una venta con sus líneas (producto o servicio) y descuenta stock atómicamente cuando aplica. security definer para que Recepción pueda venderla sin permisos directos de escritura en products/sales/sale_items.';

-- ── RLS: Admin y Recepción pueden leer para armar/consultar una venta ─────
-- (la escritura sigue pasando por create_sale, security definer; las
-- policies "... admin can manage" existentes se mantienen para Admin desde
-- Catálogo — CRUD completo de inventario sigue siendo solo-Admin).
create policy "products: reception can select"
  on public.products for select
  to authenticated
  using (public.has_role(array['Admin', 'Recepción']));

create policy "sales: reception can select"
  on public.sales for select
  to authenticated
  using (public.has_role(array['Admin', 'Recepción']));

create policy "sale_items: reception can select"
  on public.sale_items for select
  to authenticated
  using (public.has_role(array['Admin', 'Recepción']));
