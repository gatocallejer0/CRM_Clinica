-- Agrega el campo "NIT" al catálogo administrable de preguntas y expone en
-- patient_summary el NIT junto con national_id y emergency_contact (estas
-- dos ya existían en el catálogo desde 0004_dynamic_form.sql, pero no
-- estaban aplanadas en la vista) para mostrarlos en el popup de Expediente.

insert into public.form_fields (section, key, label, field_type, required, sort_order)
values ('general', 'nit', 'NIT', 'text', false, 12)
on conflict (key) do nothing;

create or replace view public.patient_summary
with (security_invoker = true)
as
select
  p.id,
  p.email,
  p.registered_by,
  p.created_at,
  max(a.value) filter (where f.key = 'full_name') as full_name,
  max(a.value) filter (where f.key = 'phone') as phone,
  max(a.value) filter (where f.key = 'age') as age,
  max(a.value) filter (where f.key = 'birth_date') as birth_date,
  max(a.value) filter (where f.key = 'blood_type') as blood_type,
  max(a.value) filter (where f.key = 'allergies') as allergies,
  max(a.value) filter (where f.key = 'nit') as nit,
  max(a.value) filter (where f.key = 'national_id') as national_id,
  max(a.value) filter (where f.key = 'emergency_contact') as emergency_contact
from public.patients p
left join public.patient_answers a on a.patient_id = p.id
left join public.form_fields f on f.id = a.field_id
group by p.id, p.email, p.registered_by, p.created_at;

comment on view public.patient_summary is 'Datos de paciente más usados (nombre, documento, teléfono, edad, fecha de nacimiento, tipo de sangre, alergias, NIT, contacto de emergencia) aplanados desde patient_answers, para Agenda y Expediente.';
