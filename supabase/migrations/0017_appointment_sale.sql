-- Al marcar una cita como "atendida" (a mano o automáticamente cuando ya
-- pasó su horario, ver listAppointments en app/actions/appointments.ts), se
-- crea un cobro pendiente con el servicio de esa cita — así Recepción no
-- tiene que dar de alta la venta a mano cada vez.

-- ── sales.appointment_id ───────────────────────────────────────────────────
-- Liga la venta autogenerada a la cita que la originó. Nullable: las ventas
-- creadas a mano desde Cobros (sin cita de por medio) siguen sin este dato.
alter table public.sales
  add column if not exists appointment_id uuid references public.appointments (id) on delete set null;

comment on column public.sales.appointment_id is 'Cita que originó esta venta automáticamente al marcarse "atendida" — null si la venta se creó a mano desde Cobros.';

-- Único índice parcial (solo donde no es null): evita crear dos veces el
-- cobro de la misma cita si por alguna razón se dispara el intento más de
-- una vez (ej. dos requests casi simultáneos marcando la misma cita).
create unique index if not exists sales_appointment_id_unique_idx
  on public.sales (appointment_id)
  where appointment_id is not null;

-- ── create_sale: acepta appointment_id y status opcionales ────────────────
-- Se recrea (no solo CREATE OR REPLACE) para dejar la firma completa
-- explícita, igual que register_patient en 0004_dynamic_form.sql.
drop function if exists public.create_sale(uuid, uuid, text, text, jsonb);

create or replace function public.create_sale(
  p_patient_id uuid,
  p_sold_by uuid,
  p_sold_by_name text,
  p_notes text,
  p_items jsonb,
  p_appointment_id uuid default null,
  p_status text default 'pagado'
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

  insert into public.sales (patient_id, sold_by, sold_by_name, total, notes, appointment_id, status)
  values (p_patient_id, p_sold_by, p_sold_by_name, 0, p_notes, p_appointment_id, p_status)
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

comment on function public.create_sale is 'Registra una venta con sus líneas (producto o servicio) y descuenta stock atómicamente cuando aplica. security definer para que Recepción (o el propio flujo de citas) pueda registrarla sin permisos directos de escritura en products/sales/sale_items. p_appointment_id liga la venta a la cita que la originó (null si se creó a mano); p_status permite crearla directo como pendiente_pago.';
