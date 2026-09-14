-- Método de pago (efectivo/tarjeta/transferencia) de una venta, pedido por
-- la clienta tras la demo. Se captura al crear la venta (que nace "pagado"
-- por defecto, ver 0016_sale_status.sql) y al marcar como "pagado" desde el
-- detalle una venta que estaba "pendiente_pago". Nullable: no se le exige a
-- las ventas ya existentes, ni a un estado distinto de "pagado".
alter table public.sales
  add column if not exists payment_method text
  check (payment_method in ('efectivo', 'tarjeta', 'transferencia'));

comment on column public.sales.payment_method is 'Cómo se cobró la venta: efectivo, tarjeta o transferencia. Null si aún no está pagada.';

-- ── create_sale: acepta payment_method opcional ────────────────────────────
-- CREATE OR REPLACE no basta acá: agregar un parámetro nuevo al final NO
-- reemplaza la función existente, crea una segunda sobrecarga (mismo caso
-- que resolvió el DROP de 0017_appointment_sale.sql al pasar de 5 a 7
-- parámetros) — y con dos versiones del mismo nombre, hasta un simple
-- `comment on function` sin lista de argumentos falla por ambigüedad. Se
-- elimina primero la versión de 7 parámetros antes de crear la de 8. También
-- se elimina la propia versión de 8 por si un intento previo de este mismo
-- script ya la había creado antes de fallar en el `comment on function`.
drop function if exists public.create_sale(uuid, uuid, text, text, jsonb, uuid, text);
drop function if exists public.create_sale(uuid, uuid, text, text, jsonb, uuid, text, text);

create or replace function public.create_sale(
  p_patient_id uuid,
  p_sold_by uuid,
  p_sold_by_name text,
  p_notes text,
  p_items jsonb,
  p_appointment_id uuid default null,
  p_status text default 'pagado',
  p_payment_method text default null
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

  if p_status not in ('borrador', 'pagado', 'pendiente_pago') then
    raise exception 'Estado inválido: %', p_status;
  end if;

  if p_payment_method is not null and p_payment_method not in ('efectivo', 'tarjeta', 'transferencia') then
    raise exception 'Método de pago inválido: %', p_payment_method;
  end if;

  insert into public.sales (patient_id, sold_by, sold_by_name, total, notes, appointment_id, status, payment_method)
  values (p_patient_id, p_sold_by, p_sold_by_name, 0, p_notes, p_appointment_id, p_status, p_payment_method)
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

comment on function public.create_sale is 'Registra una venta con sus líneas (producto o servicio) y descuenta stock atómicamente cuando aplica. security definer para que Recepción (o el propio flujo de citas) pueda registrarla sin permisos directos de escritura en products/sales/sale_items. p_appointment_id liga la venta a la cita que la originó (null si se creó a mano); p_status permite crearla directo como pendiente_pago; p_payment_method solo tiene sentido si p_status es pagado.';

-- ── update_sale_status: acepta payment_method opcional ─────────────────────
-- Mismo motivo que arriba: se elimina la versión de 2 parámetros antes de
-- crear la de 3. Si no se manda payment_method (null), conserva el método ya
-- guardado en vez de borrarlo — así cambiar el estado a "borrador" o
-- "pendiente_pago" sin tocar el selector de método no pierde el dato si
-- luego se vuelve a marcar "pagado".
drop function if exists public.update_sale_status(uuid, text);
drop function if exists public.update_sale_status(uuid, text, text);

create or replace function public.update_sale_status(
  p_sale_id uuid,
  p_status text,
  p_payment_method text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('borrador', 'pagado', 'pendiente_pago') then
    raise exception 'Estado inválido: %', p_status;
  end if;

  if p_payment_method is not null and p_payment_method not in ('efectivo', 'tarjeta', 'transferencia') then
    raise exception 'Método de pago inválido: %', p_payment_method;
  end if;

  update public.sales
  set status = p_status,
      payment_method = coalesce(p_payment_method, payment_method)
  where id = p_sale_id;

  if not found then
    raise exception 'Venta no encontrada.';
  end if;
end;
$$;

comment on function public.update_sale_status is 'Cambia el estado de una venta (borrador/pagado/pendiente_pago) y, si se manda, su método de pago. security definer para que Recepción pueda hacerlo sin permiso de escritura directo en sales.';
