-- CRM Clínica — permite agendar una cita para una paciente que todavía no
-- se ha registrado (llena el formulario público hasta el día de su cita).
--
-- El personal de Recepción puede crear un registro mínimo de paciente
-- (solo nombre) directamente desde "Nueva cita", sin correo todavía.
-- register_patient() (alta pública) sigue exigiendo correo válido — este
-- cambio solo afecta altas hechas por personal autenticado.

alter table public.patients alter column email drop not null;

comment on column public.patients.email is 'Puede ser null cuando el registro lo crea Recepción al agendar una cita para una paciente que aún no llena el formulario público.';
