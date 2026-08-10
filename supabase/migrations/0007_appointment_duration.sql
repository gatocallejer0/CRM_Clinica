-- CRM Clínica — duración editable por cita.
--
-- Antes la duración se calculaba solo a partir del servicio (duration_minutes
-- de `services`), así que toda cita del mismo servicio ocupaba el mismo
-- espacio en el calendario sin poder ajustarse caso por caso. Ahora cada
-- cita guarda su propia duración (con el servicio como valor por defecto al
-- crearla, pero editable libremente).

alter table public.appointments
  add column if not exists duration_minutes integer not null default 30;

comment on column public.appointments.duration_minutes is 'Duración de la cita en minutos. Se sugiere a partir del servicio al crear la cita, pero es editable.';
