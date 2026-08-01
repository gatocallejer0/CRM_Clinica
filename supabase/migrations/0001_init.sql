-- CRM Clínica — esquema inicial: roles y perfiles de usuario.
--
-- Modelo extensible: los roles son datos (filas en `roles`), no un enum fijo,
-- para poder agregar nuevos roles de seguridad sin migraciones futuras.

-- ── roles ──────────────────────────────────────────────────────────────────
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now()
);

comment on table public.roles is 'Roles de acceso del personal de la clínica (extensible).';

insert into public.roles (name, description) values
  ('Admin', 'Control total del sistema, incluida la gestión de usuarios.'),
  ('Doctor', 'Acceso a sus pacientes y agenda.'),
  ('Recepción', 'Registro de pacientes y agendamiento de citas.')
on conflict (name) do nothing;

-- ── profiles ───────────────────────────────────────────────────────────────
-- Un perfil por cada usuario de auth.users. No hay registro público: los
-- perfiles se crean explícitamente desde el panel de administración
-- (ver app/actions/users.ts), por lo que aquí NO hay trigger de auto-creación
-- con un rol por defecto.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role_id uuid not null references public.roles (id),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is 'Datos de perfil y rol de cada usuario del CRM.';

create index if not exists profiles_role_id_idx on public.profiles (role_id);

-- ── Row Level Security ───────────────────────────────────────────────────
alter table public.roles enable row level security;
alter table public.profiles enable row level security;

-- Cualquier usuario autenticado puede leer el catálogo de roles (necesario
-- para poblar el selector al crear usuarios).
create policy "roles: authenticated can read"
  on public.roles for select
  to authenticated
  using (true);

-- Un usuario puede leer su propio perfil.
create policy "profiles: read own"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

-- Un Admin puede leer todos los perfiles.
create policy "profiles: admin can read all"
  on public.profiles for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      join public.roles r on r.id = p.role_id
      where p.id = (select auth.uid())
        and r.name = 'Admin'
    )
  );

-- Nota: los inserts/updates de `profiles` (alta de usuarios, cambio de rol)
-- se hacen desde Server Actions usando la service_role key (createAdminClient
-- en lib/supabase/server.ts), que ya verificó el rol Admin en el servidor y
-- por lo tanto bypasea RLS. No se define policy de insert/update para el rol
-- `authenticated` a propósito.
