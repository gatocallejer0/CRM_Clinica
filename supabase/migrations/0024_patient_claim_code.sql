-- Auditoría de seguridad — Lote 3, opción 3 (F6/F35): register_patient() es
-- pública (rol anon) y cuando el correo ya tiene un registro "cáscara"
-- (creado por Recepción al agendar por teléfono, sin datos reales todavía),
-- completaba esos datos sin ninguna prueba de que quien envía el formulario
-- es la misma persona. Cualquiera que supiera o adivinara el correo de una
-- paciente ya agendada podía rellenar su expediente con datos falsos antes
-- que ella (F6).
--
-- Fix elegido: al crear la paciente "cáscara", Recepción genera un código
-- corto (claim_code) y se lo da a la paciente por teléfono/WhatsApp al
-- agendar. El formulario público debe incluirlo para completar un registro
-- existente — sin sesión, sin código correcto, no hay forma de tocar esos
-- datos. Una llamada autenticada (personal, ej. "Nuevo paciente" en Admin)
-- sigue sin necesitarlo: auth.uid() no es null en ese caso, y el hueco
-- original era específicamente sobre llamadas anónimas.
--
-- De paso cierra F35 (enumeración de correos): antes el mensaje distinguía
-- "ya existe con datos reales" de otros casos; ahora ese caso y el de
-- código incorrecto/faltante devuelven el mismo texto genérico, así que
-- ya no se puede usar el formulario para confirmar si un correo es
-- paciente de la clínica.

alter table public.patients
  add column if not exists claim_code text;

comment on column public.patients.claim_code is 'Código de una sola vez que Recepción comparte con la paciente al agendarle una cita por teléfono (registro "cáscara"). Lo exige register_patient() para completar ese registro desde una llamada sin sesión; se limpia (null) en cuanto se usa. Null en un registro con datos reales ya completados, o en uno creado directo con datos reales.';

-- patient_summary (0014_patient_summary_fields.sql) es security_invoker: un
-- anon que la consultara directo seguiría sin ver nada (RLS de patients solo
-- da select a authenticated, ver 0002_patients.sql) — agregar claim_code acá
-- solo lo expone al personal ya autenticado que usa Agenda/Expediente, que
-- es justo quien necesita volver a leérselo a la paciente si lo perdió.
create or replace view public.patient_summary
with (security_invoker = true)
as
select
  p.id,
  p.email,
  p.registered_by,
  p.created_at,
  p.claim_code,
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
group by p.id, p.email, p.registered_by, p.created_at, p.claim_code;

comment on view public.patient_summary is 'Datos de paciente más usados (nombre, documento, teléfono, edad, fecha de nacimiento, tipo de sangre, alergias, NIT, contacto de emergencia, claim_code) aplanados desde patient_answers, para Agenda y Expediente.';

-- register_patient pasa de 2 a 3 parámetros — igual que con create_sale en
-- 0021_sale_payment_method.sql, CREATE OR REPLACE con un parámetro nuevo NO
-- reemplaza la función existente, crea una segunda sobrecarga. Se elimina
-- primero la de 2 parámetros.
drop function if exists public.register_patient(text, jsonb);

create or replace function public.register_patient(
  p_email text,
  p_answers jsonb default '{}'::jsonb,
  p_claim_code text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_existing_id uuid;
  v_has_real_data boolean;
  v_claim_code text;
  v_field record;
  v_value text;
  v_generic_error text := 'No se pudo completar tu registro con este correo. Si ya tienes una cita agendada, verifica el código que te compartió la clínica; si crees que esto es un error, contáctanos directamente.';
begin
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Correo inválido.';
  end if;

  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'Formato de respuestas inválido.';
  end if;

  select id, claim_code into v_existing_id, v_claim_code
  from public.patients
  where lower(email) = lower(p_email);

  if v_existing_id is not null then
    select exists (
      select 1
      from public.patient_answers pa
      join public.form_fields ff on ff.id = pa.field_id
      where pa.patient_id = v_existing_id and ff.key <> 'full_name'
    ) into v_has_real_data;

    if v_has_real_data then
      raise exception '%', v_generic_error;
    end if;

    -- Una llamada sin sesión (auth.uid() null, ej. el formulario público)
    -- necesita el código; una llamada autenticada (personal en Admin) no —
    -- el hueco original era específicamente sobre quien no tiene sesión.
    if auth.uid() is null then
      if v_claim_code is null or p_claim_code is null or upper(trim(p_claim_code)) <> v_claim_code then
        raise exception '%', v_generic_error;
      end if;
    end if;

    v_patient_id := v_existing_id;
    update public.patients set claim_code = null where id = v_patient_id;
  else
    insert into public.patients (email) values (p_email)
    returning id into v_patient_id;
  end if;

  for v_field in
    select id, key, field_type, required
    from public.form_fields
    where active
  loop
    v_value := nullif(trim(both from (p_answers ->> v_field.key)), '');

    -- Solo exige la pregunta si tampoco hay ya una respuesta guardada (caso
    -- de la paciente "cáscara" completando su registro).
    if v_field.required and v_value is null and not exists (
      select 1 from public.patient_answers pa
      where pa.patient_id = v_patient_id and pa.field_id = v_field.id
    ) then
      raise exception 'La pregunta "%" es obligatoria.', v_field.key;
    end if;

    if v_value is not null then
      if v_field.field_type = 'select' and not exists (
        select 1 from public.form_field_options o
        where o.field_id = v_field.id and o.active and o.value = v_value
      ) then
        raise exception 'Opción inválida para "%".', v_field.key;
      end if;

      insert into public.patient_answers (patient_id, field_id, value)
      values (v_patient_id, v_field.id, v_value)
      on conflict (patient_id, field_id) do update set value = excluded.value;
    end if;
  end loop;

  return v_patient_id;
end;
$$;

comment on function public.register_patient is 'Alta pública de paciente (sin sesión): valida contra el catálogo form_fields/form_field_options y crea patients + patient_answers en una sola transacción. Si el correo ya tiene una paciente "cáscara" (sin datos reales) la completa —exigiendo claim_code si la llamada no tiene sesión—; si ya tiene datos reales, o el código no coincide, rechaza el envío con un mensaje genérico (no distingue el motivo, para no filtrar si un correo ya es paciente). Único punto de entrada de anon a estas tablas.';

-- Una función recién creada (no reemplazada in-place, ver el drop de arriba)
-- nace con EXECUTE otorgado a PUBLIC por defecto en Postgres — exactamente
-- el tipo de hueco que esta misma auditoría corrigió en el Lote 2. Se revoca
-- y se vuelve a otorgar a anon (igual que hizo 0004_dynamic_form.sql para la
-- versión de 2 parámetros) y también a authenticated: el diálogo "Nuevo
-- paciente" de Admin (personal con sesión) llama esta misma función.
revoke all on function public.register_patient(text, jsonb, text) from public;
grant execute on function public.register_patient(text, jsonb, text) to anon, authenticated;
