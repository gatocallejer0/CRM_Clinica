-- CRM Clínica — alta pública de pacientes (sin cuenta ni contraseña).
--
-- Las pacientes no tienen usuario en el sistema, así que el rol `anon` NO
-- recibe permisos directos sobre `patients` / `medical_history` (las
-- policies de 0002_patients.sql son `to authenticated` únicamente). En su
-- lugar, esta función SECURITY DEFINER es el único punto de entrada: valida
-- los datos e inserta ambas filas en una sola transacción, corriendo con los
-- privilegios de su dueño (bypassa RLS solo dentro de esta función).

create or replace function public.register_patient(
  p_email text,
  p_full_name text,
  p_national_id text,
  p_age smallint,
  p_birth_date date,
  p_phone text,
  p_occupation text,
  p_religion text,
  p_marital_status text,
  p_birthplace text,
  p_referral_source text,
  p_emergency_contact text,
  p_blood_type text,
  p_illnesses text,
  p_medications text,
  p_surgeries text,
  p_allergies text,
  p_family_medical_history text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
begin
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Correo inválido.';
  end if;

  insert into public.patients (
    email, full_name, national_id, age, birth_date, phone, occupation,
    religion, marital_status, birthplace, referral_source, emergency_contact
  ) values (
    p_email, p_full_name, p_national_id, p_age, p_birth_date, p_phone, p_occupation,
    p_religion, p_marital_status, p_birthplace, p_referral_source, p_emergency_contact
  )
  returning id into v_patient_id;

  insert into public.medical_history (
    patient_id, blood_type, illnesses, medications, surgeries, allergies, family_medical_history
  ) values (
    v_patient_id, p_blood_type, p_illnesses, p_medications, p_surgeries, p_allergies, p_family_medical_history
  );

  return v_patient_id;
end;
$$;

comment on function public.register_patient is 'Alta pública de paciente (sin sesión): valida y crea patients + medical_history en una sola transacción. Único punto de entrada de anon a estas tablas.';

revoke all on function public.register_patient(
  text, text, text, smallint, date, text, text, text, text, text, text, text,
  text, text, text, text, text, text
) from public;

grant execute on function public.register_patient(
  text, text, text, smallint, date, text, text, text, text, text, text, text,
  text, text, text, text, text, text
) to anon;
