-- Control de roles: qué pantallas puede ver cada rol (Admin Center > Roles
-- y permisos). El rol Admin no pasa por esta tabla — siempre ve todo, caso
-- especial en código (ver requireScreen en lib/auth/roles.ts) para que nunca
-- pueda bloquearse a sí mismo el acceso.

create table if not exists public.role_screens (
  role_id uuid not null references public.roles (id) on delete cascade,
  screen_key text not null,
  primary key (role_id, screen_key)
);

comment on table public.role_screens is
  'Pantallas visibles para cada rol (excepto Admin, que siempre ve todo). Ausencia de fila para un rol = sin acceso a esa pantalla.';

-- Lectura abierta a cualquier autenticado: cada usuario necesita poder leer
-- las pantallas de SU PROPIO rol para armar el sidebar (mismo criterio que
-- la tabla `roles`). Las escrituras van solo por Server Actions con
-- createAdminClient() (ver app/actions/roles.ts) — no hay policy de
-- insert/update/delete a propósito, igual que audit_log.
alter table public.role_screens enable row level security;

create policy "role_screens: authenticated can read"
  on public.role_screens for select
  to authenticated
  using (true);

-- Semilla: replica exactamente los arrays hardcodeados que tenía
-- nav-config.ts antes de este cambio, para que nada cambie de
-- comportamiento hasta que un Admin edite algo desde el panel nuevo.
insert into public.role_screens (role_id, screen_key)
select r.id, v.screen_key
from (values
  ('Doctor', 'dashboard'), ('Doctor', 'agenda'), ('Doctor', 'pacientes'),
  ('Doctor', 'admin'), ('Doctor', 'cuenta'),
  ('Recepción', 'dashboard'), ('Recepción', 'agenda'), ('Recepción', 'cobros')
) as v(role_name, screen_key)
join public.roles r on r.name = v.role_name
on conflict do nothing;
