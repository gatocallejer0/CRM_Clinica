-- CRM Clínica — Agenda (citas) y Expediente clínico (registros por paciente).

-- ── has_role: helper genérico, generaliza is_admin() para más roles ──────
create or replace function public.has_role(role_names text[])
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    join public.roles r on r.id = p.role_id
    where p.id = auth.uid()
      and p.active
      and r.name = any(role_names)
  );
$$;

comment on function public.has_role is 'true si la usuaria autenticada está activa y tiene uno de los roles dados. Generaliza is_admin() para políticas que necesitan más de un rol.';

-- ── services ───────────────────────────────────────────────────────────────
-- Catálogo mínimo: solo lo que Agenda necesita hoy (nombre, categoría para el
-- color de la vista semanal, duración, precio). El módulo Catálogo e
-- inventario completo (productos, proveedores, stock) queda para después,
-- extendiendo esta misma tabla en vez de duplicarla.
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('prenatal', 'general', 'seguimiento')),
  duration_minutes integer not null default 30,
  price numeric(10, 2),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.services is 'Servicios que se pueden agendar. Catálogo mínimo — se ampliará con el módulo Catálogo e inventario.';

insert into public.services (name, category, duration_minutes, price) values
  ('Consulta general', 'general', 30, 350),
  ('Control prenatal', 'prenatal', 30, 400),
  ('Ecografía obstétrica', 'prenatal', 45, 550),
  ('Papanicolaou', 'general', 20, 300),
  ('Planificación familiar', 'general', 30, 350),
  ('Control postparto', 'seguimiento', 30, 350)
on conflict do nothing;

-- ── appointments ───────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid references public.profiles (id) on delete set null,
  service_id uuid not null references public.services (id) on delete restrict,
  scheduled_at timestamptz not null,
  status text not null default 'confirmada' check (status in ('confirmada', 'en_espera', 'atendida', 'cancelada')),
  notes text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.appointments is 'Citas de la agenda (día/semana/mes).';

create index if not exists appointments_scheduled_at_idx on public.appointments (scheduled_at);
create index if not exists appointments_patient_id_idx on public.appointments (patient_id);
create index if not exists appointments_doctor_id_idx on public.appointments (doctor_id);

-- ── clinical_records ───────────────────────────────────────────────────────
-- Un solo modelo de "registro clínico" por visita — cubre a la vez el
-- historial (motivo/diagnóstico), recetas (medicamento/indicaciones) y los
-- signos vitales, tal como los captura el modal único "+ Nuevo registro" del
-- diseño. La pestaña Documentos queda pendiente (requiere Supabase Storage).
create table if not exists public.clinical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  doctor_id uuid references public.profiles (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  record_date date not null default current_date,
  reason text,
  diagnosis text,
  evolution_notes text,
  medical_orders text,
  medication text,
  medication_instructions text,
  weight_kg numeric(5, 2),
  height_cm numeric(5, 2),
  last_menstrual_period date,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

comment on table public.clinical_records is 'Registro clínico por visita (diagnóstico, notas, órdenes, receta y signos vitales). Antecedentes generales de la paciente viven en patient_answers.';

create index if not exists clinical_records_patient_date_idx on public.clinical_records (patient_id, record_date desc);

-- ── patient_summary ────────────────────────────────────────────────────────
-- Aplana las respuestas dinámicas más usadas (patient_answers) en columnas,
-- para no repetir el pivote en cada consulta de Agenda/Expediente.
-- `security_invoker = true` es clave: la vista corre con los permisos de
-- quien consulta (RLS de patients/patient_answers aplica igual que si se
-- consultaran las tablas directamente), no con los del dueño de la vista.
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
  max(a.value) filter (where f.key = 'allergies') as allergies
from public.patients p
left join public.patient_answers a on a.patient_id = p.id
left join public.form_fields f on f.id = a.field_id
group by p.id, p.email, p.registered_by, p.created_at;

comment on view public.patient_summary is 'Datos de paciente más usados (nombre, teléfono, edad, tipo de sangre, alergias) aplanados desde patient_answers, para Agenda y Expediente.';

-- profiles: cualquier personal activo puede ver el directorio de Doctoras
-- (no el resto del personal) — lo necesita el selector de doctor al agendar
-- una cita. No amplía el acceso a perfiles de Admin/Recepción.
--
-- Usa has_role() (security definer) para comprobar "quien pregunta está
-- activa" en vez de una subconsulta directa a profiles: una policy de
-- `profiles` que consulta `profiles` directamente entra en recursión
-- infinita (error 42P17) — el mismo problema que is_admin() ya evita en
-- 0001_init.sql.
create policy "profiles: active staff can read doctors"
  on public.profiles for select
  to authenticated
  using (
    active
    and exists (select 1 from public.roles r where r.id = role_id and r.name = 'Doctor')
    and public.has_role(array['Admin', 'Doctor', 'Recepción'])
  );

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.clinical_records enable row level security;

-- services: cualquier personal activo puede leer el catálogo (lo necesita
-- Agenda para "Nueva cita"). Sin policies de escritura por ahora — se
-- gestiona por migración hasta que exista el módulo Catálogo.
create policy "services: active staff can select"
  on public.services for select
  to authenticated
  using (public.has_role(array['Admin', 'Doctor', 'Recepción']));

-- appointments: Admin, Doctor y Recepción pueden ver y gestionar la agenda.
create policy "appointments: scheduling staff can select"
  on public.appointments for select
  to authenticated
  using (public.has_role(array['Admin', 'Doctor', 'Recepción']));

create policy "appointments: scheduling staff can insert"
  on public.appointments for insert
  to authenticated
  with check (public.has_role(array['Admin', 'Doctor', 'Recepción']));

create policy "appointments: scheduling staff can update"
  on public.appointments for update
  to authenticated
  using (public.has_role(array['Admin', 'Doctor', 'Recepción']));

-- clinical_records: solo Admin y Doctor — Recepción no ve notas médicas.
create policy "clinical_records: clinical staff can select"
  on public.clinical_records for select
  to authenticated
  using (public.has_role(array['Admin', 'Doctor']));

create policy "clinical_records: clinical staff can insert"
  on public.clinical_records for insert
  to authenticated
  with check (public.has_role(array['Admin', 'Doctor']));

create policy "clinical_records: clinical staff can update"
  on public.clinical_records for update
  to authenticated
  using (public.has_role(array['Admin', 'Doctor']));
