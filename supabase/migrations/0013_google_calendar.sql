-- CRM Clínica — sincronización de un solo sentido (Agenda → Google Calendar):
-- cada doctora conecta su cuenta de Google una vez; desde ahí, crear/editar/
-- cancelar una cita en la Agenda empuja el cambio a su Google Calendar
-- automáticamente. No hay sincronización de vuelta (editar en Google no
-- afecta la cita en el CRM) — ver conversación de diseño.

-- ── google_calendar_connections ──────────────────────────────────────────
-- Tokens OAuth por doctora. Nunca expuesta por RLS a `authenticated` — igual
-- que audit_log, solo el código de servidor (que ya validó sesión/rol) la
-- toca, usando el admin client (service role, bypassa RLS).
create table if not exists public.google_calendar_connections (
  doctor_id uuid primary key references public.profiles (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  token_expires_at timestamptz not null,
  google_email text,
  connected_at timestamptz not null default now()
);

comment on table public.google_calendar_connections is 'Tokens OAuth de Google Calendar por doctora, uno por profile. Sin policies para authenticated a propósito — solo el admin client (service role) desde server actions ya autorizados la toca.';

alter table public.google_calendar_connections enable row level security;

-- ── appointments: referencia al evento espejo en Google Calendar ────────
alter table public.appointments add column if not exists google_event_id text;

comment on column public.appointments.google_event_id is 'id del evento espejo en Google Calendar (bucket "doctora"), null si la doctora no tiene conectado su calendario o el evento aún no se creó.';
