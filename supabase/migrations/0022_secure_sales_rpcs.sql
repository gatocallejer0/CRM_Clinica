-- Auditoría de seguridad — Lote 2 (F2/F3/F7/F8): create_sale() y
-- update_sale_status() son SECURITY DEFINER (bypasean RLS a propósito) pero
-- nunca revisaban el rol de quien llama, y ninguna migración les revocó el
-- permiso de ejecución por defecto que Postgres otorga a PUBLIC en una
-- función nueva. En la práctica esto significa que cualquier cuenta con una
-- sesión de Supabase válida — sin necesidad de tener la pantalla "cobros" —
-- podía invocar el RPC directo (saltándose por completo el requireScreen()
-- de TypeScript) para crear ventas falsas, descontar inventario real, o
-- marcar cualquier venta como pagada sin dejar rastro.
--
-- create_sale se llama desde dos flujos legítimos con pantallas distintas:
-- "cobros" (venta manual) y "agenda" (el cobro automático al marcar una cita
-- "atendida", ver createSaleFromAttendedAppointment en catalog.ts) — por eso
-- su chequeo acepta cualquiera de las dos. update_sale_status solo se llama
-- desde el detalle de una venta en Cobros, así que exige solo esa pantalla.

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
  if not public.has_screen(array['cobros', 'agenda']) then
    raise exception 'No tienes acceso para registrar ventas.';
  end if;

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

comment on function public.create_sale is 'Registra una venta con sus líneas (producto o servicio) y descuenta stock atómicamente cuando aplica. security definer para que Recepción (o el propio flujo de citas) pueda registrarla sin permisos directos de escritura en products/sales/sale_items — por eso exige has_screen(cobros/agenda) por dentro, no solo en la capa de TypeScript. p_appointment_id liga la venta a la cita que la originó (null si se creó a mano); p_status permite crearla directo como pendiente_pago; p_payment_method solo tiene sentido si p_status es pagado.';

revoke all on function public.create_sale(uuid, uuid, text, text, jsonb, uuid, text, text) from public;
grant execute on function public.create_sale(uuid, uuid, text, text, jsonb, uuid, text, text) to authenticated;

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
  if not public.has_screen(array['cobros']) then
    raise exception 'No tienes acceso para cambiar el estado de una venta.';
  end if;

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

comment on function public.update_sale_status is 'Cambia el estado de una venta (borrador/pagado/pendiente_pago) y, si se manda, su método de pago. security definer para que Recepción pueda hacerlo sin permiso de escritura directo en sales — por eso exige has_screen(cobros) por dentro, no solo en la capa de TypeScript.';

revoke all on function public.update_sale_status(uuid, text, text) from public;
grant execute on function public.update_sale_status(uuid, text, text) to authenticated;
