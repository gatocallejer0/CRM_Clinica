-- CRM Clínica — formulario de pacientes dinámico y administrable.
--
-- Reemplaza las columnas fijas de patients/medical_history por un catálogo
-- de preguntas (form_fields), un catálogo de opciones por pregunta
-- (form_field_options) y las respuestas de cada paciente (patient_answers).
-- Así el Admin agrega/inactiva/elimina preguntas y opciones desde la UI, sin
-- necesitar una migración de esquema cada vez.

-- ── form_fields ────────────────────────────────────────────────────────────
create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('general', 'medical_history')),
  key text not null unique,
  label text not null,
  field_type text not null check (field_type in ('text', 'textarea', 'number', 'date', 'select')),
  required boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.form_fields is 'Catálogo administrable de preguntas del formulario de alta de pacientes.';

-- ── form_field_options ───────────────────────────────────────────────────
create table if not exists public.form_field_options (
  id uuid primary key default gen_random_uuid(),
  field_id uuid not null references public.form_fields (id) on delete cascade,
  value text not null,
  active boolean not null default true,
  sort_order integer not null default 0,
  unique (field_id, value)
);

comment on table public.form_field_options is 'Opciones del catálogo para preguntas tipo "select" (ej. religión, estado civil).';

-- ── patient_answers ────────────────────────────────────────────────────────
-- Respuesta de una paciente a una pregunta del catálogo. Se guarda el texto
-- de la respuesta (no una referencia a form_field_options) para que las
-- respuestas históricas sobrevivan aunque luego se elimine la opción del
-- catálogo. `on delete restrict` hacia form_fields obliga a inactivar en vez
-- de eliminar una pregunta que ya tiene respuestas.
create table if not exists public.patient_answers (
  patient_id uuid not null references public.patients (id) on delete cascade,
  field_id uuid not null references public.form_fields (id) on delete restrict,
  value text not null,
  primary key (patient_id, field_id)
);

comment on table public.patient_answers is 'Respuestas de cada paciente al catálogo dinámico de preguntas (reemplaza las columnas fijas de patients/medical_history).';

create index if not exists patient_answers_field_id_idx on public.patient_answers (field_id);

-- ── patients: quitar columnas que ahora viven en patient_answers ─────────
alter table public.patients
  drop column if exists full_name,
  drop column if exists national_id,
  drop column if exists age,
  drop column if exists birth_date,
  drop column if exists phone,
  drop column if exists occupation,
  drop column if exists religion,
  drop column if exists marital_status,
  drop column if exists birthplace,
  drop column if exists referral_source,
  drop column if exists emergency_contact;

-- ── medical_history: reemplazada por patient_answers ──────────────────────
drop table if exists public.medical_history;

-- ── Semilla: preguntas y opciones que ya existían como columnas fijas ────
insert into public.form_fields (section, key, label, field_type, required, sort_order) values
  ('general', 'full_name', 'Nombre completo de paciente', 'text', false, 1),
  ('general', 'national_id', 'Documento de Identificación (DPI)', 'text', false, 2),
  ('general', 'age', 'Edad de paciente', 'number', false, 3),
  ('general', 'birth_date', 'Fecha de nacimiento', 'date', false, 4),
  ('general', 'phone', 'Número de teléfono', 'text', false, 5),
  ('general', 'occupation', 'Ocupación', 'text', false, 6),
  ('general', 'religion', 'Religión', 'select', false, 7),
  ('general', 'marital_status', 'Estado civil', 'select', false, 8),
  ('general', 'birthplace', 'Lugar de nacimiento', 'select', false, 9),
  ('general', 'referral_source', '¿Por qué medio te enteraste de la clínica?', 'select', false, 10),
  ('general', 'emergency_contact', 'Nombre y número de contacto de emergencia', 'text', false, 11),
  ('medical_history', 'blood_type', '¿Conoces tu grupo de sangre? Indica el tipo', 'text', false, 1),
  ('medical_history', 'illnesses', '¿Padeces de alguna enfermedad?', 'textarea', false, 2),
  ('medical_history', 'medications', '¿Tomas algún medicamento o suplemento? Indica el nombre', 'textarea', false, 3),
  ('medical_history', 'surgeries', '¿Has tenido alguna cirugía? Indica el tipo y la fecha', 'textarea', false, 4),
  ('medical_history', 'allergies', '¿Eres alérgica a algún medicamento o alimento? Especifica', 'textarea', false, 5),
  ('medical_history', 'family_medical_history', '¿Cuentas con familiares que padecen o padecieron alguna enfermedad? Especifica', 'textarea', false, 6)
on conflict (key) do nothing;

insert into public.form_field_options (field_id, value, sort_order)
select f.id, opt.value, opt.sort_order
from public.form_fields f
join (values
  ('religion', 'Católico', 1),
  ('religion', 'Cristiano Evangelico', 2),
  ('religion', 'Testigo de Jehova', 3),
  ('religion', 'Ateo', 4),
  ('religion', 'Ninguna', 5),
  ('religion', 'Otros', 6),
  ('marital_status', 'Soltera', 1),
  ('marital_status', 'Casada', 2),
  ('marital_status', 'Unida', 3),
  ('marital_status', 'Viuda', 4),
  ('birthplace', 'Ciudad de Guatemala', 1),
  ('birthplace', 'Otros', 2),
  ('referral_source', 'Google', 1),
  ('referral_source', 'Instagram', 2),
  ('referral_source', 'Tiktok', 3),
  ('referral_source', 'Facebook', 4),
  ('referral_source', 'Otros', 5)
) as opt(field_key, value, sort_order) on opt.field_key = f.key
on conflict (field_id, value) do nothing;

-- ── register_patient: ahora recibe respuestas dinámicas ──────────────────
drop function if exists public.register_patient(
  text, text, text, smallint, date, text, text, text, text, text, text, text,
  text, text, text, text, text, text
);

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
  v_field record;
  v_value text;
begin
  if p_email is null or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Correo inválido.';
  end if;

  if jsonb_typeof(p_answers) is distinct from 'object' then
    raise exception 'Formato de respuestas inválido.';
  end if;

  insert into public.patients (email) values (p_email)
  returning id into v_patient_id;

  for v_field in
    select id, key, field_type, required
    from public.form_fields
    where active
  loop
    v_value := nullif(trim(both from (p_answers ->> v_field.key)), '');

    if v_field.required and v_value is null then
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
      values (v_patient_id, v_field.id, v_value);
    end if;
  end loop;

  return v_patient_id;
end;
$$;

comment on function public.register_patient is 'Alta pública de paciente (sin sesión): valida contra el catálogo form_fields/form_field_options y crea patients + patient_answers en una sola transacción. Único punto de entrada de anon a estas tablas.';

revoke all on function public.register_patient(text, jsonb) from public;
grant execute on function public.register_patient(text, jsonb) to anon;

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.form_fields enable row level security;
alter table public.form_field_options enable row level security;
alter table public.patient_answers enable row level security;

-- El catálogo de preguntas/opciones ACTIVAS es público: el formulario de
-- alta lo necesita para renderizarse sin sesión. No es información
-- sensible — ya era visible en el HTML del formulario cuando era estático.
create policy "form_fields: anon can select active"
  on public.form_fields for select
  to anon
  using (active);

create policy "form_field_options: anon can select active"
  on public.form_field_options for select
  to anon
  using (active);

-- El personal activo ve el catálogo completo (incluidas preguntas inactivas,
-- necesario para mostrar respuestas históricas y para el panel de Admin).
create policy "form_fields: active staff can select all"
  on public.form_fields for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.active)
  );

create policy "form_field_options: active staff can select all"
  on public.form_field_options for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.active)
  );

-- Solo Admin gestiona el catálogo (agregar/inactivar/eliminar preguntas y
-- opciones).
create policy "form_fields: admin can insert"
  on public.form_fields for insert
  to authenticated
  with check (public.is_admin());

create policy "form_fields: admin can update"
  on public.form_fields for update
  to authenticated
  using (public.is_admin());

create policy "form_fields: admin can delete"
  on public.form_fields for delete
  to authenticated
  using (public.is_admin());

create policy "form_field_options: admin can insert"
  on public.form_field_options for insert
  to authenticated
  with check (public.is_admin());

create policy "form_field_options: admin can update"
  on public.form_field_options for update
  to authenticated
  using (public.is_admin());

create policy "form_field_options: admin can delete"
  on public.form_field_options for delete
  to authenticated
  using (public.is_admin());

-- patient_answers: mismo criterio que patients (personal activo).
create policy "patient_answers: active staff can select"
  on public.patient_answers for select
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.active)
  );

create policy "patient_answers: active staff can insert"
  on public.patient_answers for insert
  to authenticated
  with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.active)
  );

create policy "patient_answers: active staff can update"
  on public.patient_answers for update
  to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.active)
  );
