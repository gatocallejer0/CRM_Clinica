-- Cobros y pagos: estado del cobro (Borrador / Pagado / Pendiente de pago),
-- editable desde el detalle de una venta en el listado. Las ventas ya
-- existentes se asumen cobradas en el mostrador, por eso el default es
-- 'pagado' (no cambia el comportamiento actual de create_sale).
alter table public.sales
  add column if not exists status text not null default 'pagado'
  check (status in ('borrador', 'pagado', 'pendiente_pago'));

comment on column public.sales.status is 'Estado del cobro: borrador (aún no confirmado), pagado, pendiente_pago (por cobrar).';

-- ── update_sale_status ─────────────────────────────────────────────────────
-- security definer: mismo motivo que create_sale — Recepción no tiene (ni
-- necesita) permiso de escritura directo sobre sales, solo puede cambiar el
-- estado a través de esta función.
create or replace function public.update_sale_status(
  p_sale_id uuid,
  p_status text
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_status not in ('borrador', 'pagado', 'pendiente_pago') then
    raise exception 'Estado inválido: %', p_status;
  end if;

  update public.sales set status = p_status where id = p_sale_id;

  if not found then
    raise exception 'Venta no encontrada.';
  end if;
end;
$$;

comment on function public.update_sale_status is 'Cambia el estado de una venta (borrador/pagado/pendiente_pago). security definer para que Recepción pueda hacerlo sin permiso de escritura directo en sales.';
