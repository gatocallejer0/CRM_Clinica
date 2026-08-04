-- CRM Clínica — pacientes y antecedentes médicos, a partir del formulario de
-- registro "Datos generales de paciente" (Google Forms, 2 secciones).

-- ── patients ───────────────────────────────────────────────────────────────
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  national_id text,
  age smallint,
  birth_date date,
  phone text,
  occupation text,
  -- religion / marital_status / birthplace / referral_source: el formulario
  -- las presenta como opción múltiple pero cada una incluye "Otros" (texto
  -- libre), así que se guardan como texto en vez de un enum fijo.
  religion text,
  marital_status text,
  birthplace text,
  referral_source text,
  emergency_contact text,
  registered_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.patients is 'Datos generales de pacientes (sección 1 del formulario de alta).';

create index if not exists patients_registered_by_idx on public.patients (registered_by);

-- ── medical_history ────────────────────────────────────────────────────────
-- Antecedentes médicos (sección 2 del formulario). Relación 1:1 con
-- `patients`: cada pregunta del formulario admite respuesta libre ("Otro:",
-- "Especifica...", "indica el nombre/tipo/fecha"), así que se guardan como
-- texto en vez de modelar sub-estructuras que el formulario no define.
create table if not exists public.medical_history (
  patient_id uuid primary key references public.patients (id) on delete cascade,
  blood_type text,
  illnesses text,
  medications text,
  surgeries text,
  allergies text,
  family_medical_history text,
  updated_at timestamptz not null default now()
);

comment on table public.medical_history is 'Antecedentes médicos de cada paciente (sección 2 del formulario de alta).';

-- ── Row Level Security ───────────────────────────────────────────────────
-- Cualquier miembro de personal activo (Admin, Doctor, Recepción) puede ver
-- y gestionar pacientes y antecedentes: Recepción los registra, Doctor los
-- consulta/actualiza, Admin tiene control total. No hay distinción por rol a
-- nivel de fila todavía.
alter table public.patients enable row level security;
alter table public.medical_history enable row level security;

create policy "patients: active staff can select"
  on public.patients for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active
    )
  );

create policy "patients: active staff can insert"
  on public.patients for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active
    )
  );

create policy "patients: active staff can update"
  on public.patients for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active
    )
  );

create policy "medical_history: active staff can select"
  on public.medical_history for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active
    )
  );

create policy "medical_history: active staff can insert"
  on public.medical_history for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active
    )
  );

create policy "medical_history: active staff can update"
  on public.medical_history for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.active
    )
  );
