-- Auditoría de seguridad — Lote 10 (F38): create_sale() tomaba el
-- unit_price de cada línea directo del cliente (la capa de TypeScript solo
-- validaba que fuera >= 0) y lo grababa tal cual en sale_items, en vez de
-- consultar el precio real del producto/servicio en el catálogo. Un usuario
-- con la pantalla "cobros" (ej. Recepción, sin acceso a Catálogo e
-- inventario) podía vender cualquier producto o servicio al precio que
-- quisiera con solo editar el request — incluyendo Q0 — sin necesitar
-- privilegios de catálogo.
--
-- Mismo motivo que el Lote 2 para exigir has_screen() dentro de la función
-- en vez de confiar solo en la capa de TypeScript: un RPC directo se salta
-- cualquier validación que solo viva en Next.js. El precio ahora se lee de
-- products.price / services.price dentro de la propia función — el
-- unit_price que manda el cliente se ignora por completo para el cálculo.
--
-- CREATE OR REPLACE alcanza acá: la lista de parámetros no cambia respecto
-- a 0022_secure_sales_rpcs.sql, solo el cuerpo.

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

    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Cantidad inválida.';
    end if;

    if v_product_id is not null then
      -- El precio se lee de acá, no de v_item->>'unit_price': ese valor lo
      -- pone el cliente y no es de fiar (ver comentario arriba).
      select name, stock, price into v_item_name, v_stock, v_unit_price
      from public.products where id = v_product_id
      for update;

      if v_item_name is null then
        raise exception 'Producto no encontrado.';
      end if;
      if v_unit_price is null then
        raise exception 'El producto % no tiene precio configurado.', v_item_name;
      end if;
      if v_stock < v_quantity then
        raise exception 'stock_check: Stock insuficiente para %', v_item_name;
      end if;

      update public.products set stock = stock - v_quantity where id = v_product_id;

      v_subtotal := v_quantity * v_unit_price;
      insert into public.sale_items (sale_id, product_id, product_name, quantity, unit_price, subtotal)
      values (v_sale_id, v_product_id, v_item_name, v_quantity, v_unit_price, v_subtotal);

    elsif v_service_id is not null then
      select name, price into v_item_name, v_unit_price
      from public.services where id = v_service_id;
      if v_item_name is null then
        raise exception 'Servicio no encontrado.';
      end if;
      if v_unit_price is null then
        raise exception 'El servicio % no tiene precio configurado.', v_item_name;
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

comment on function public.create_sale is 'Registra una venta con sus líneas (producto o servicio) y descuenta stock atómicamente cuando aplica. security definer para que Recepción (o el propio flujo de citas) pueda registrarla sin permisos directos de escritura en products/sales/sale_items — por eso exige has_screen(cobros/agenda) por dentro, no solo en la capa de TypeScript. El precio de cada línea se lee de products.price/services.price, nunca del valor que manda el cliente. p_appointment_id liga la venta a la cita que la originó (null si se creó a mano); p_status permite crearla directo como pendiente_pago; p_payment_method solo tiene sentido si p_status es pagado.';
