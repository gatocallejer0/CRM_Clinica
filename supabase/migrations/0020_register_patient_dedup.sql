-- register_patient: evita duplicar pacientes cuando el mismo correo ya
-- existe (típicamente porque Recepción ya agendó una cita para "paciente
-- nueva" antes de que ella misma llenara el formulario público).
--
-- Regla de seguridad: el formulario es público (rol anon, sin sesión), así
-- que NUNCA debe poder pisar los datos de una paciente que ya tiene un
-- registro real — de lo contrario cualquiera podría "actualizar" (borrar en
-- la práctica) el historial de otra persona con solo conocer o adivinar su
-- correo. Por eso se distingue:
--   - Paciente "cáscara" (creada al agendar, sin ninguna respuesta real más
--     allá del nombre): es seguro completarla con las respuestas nuevas.
--   - Paciente con datos reales ya guardados: se rechaza el envío entero,
--     no se toca nada.

create or replace function public.register_patient(
  p_email text,
  p_answers jsonb default '{}'::jsonb
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
  v_field record;
  v_value text;
begin
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Correo inválido.';
  end if;

  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'Formato de respuestas inválido.';
  end if;

  select id into v_existing_id
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
      raise exception 'Ya existe un registro con este correo. Si necesitas actualizar tus datos, contacta directamente a la clínica.';
    end if;

    v_patient_id := v_existing_id;
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

comment on function public.register_patient is 'Alta pública de paciente (sin sesión): valida contra el catálogo form_fields/form_field_options y crea patients + patient_answers en una sola transacción. Si el correo ya tiene una paciente "cáscara" (sin datos reales) la completa; si ya tiene datos reales, rechaza el envío para no pisarlos. Único punto de entrada de anon a estas tablas.';
