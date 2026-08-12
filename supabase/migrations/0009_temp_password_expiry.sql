-- Contraseña temporal autogenerada al crear un usuario: vence 2 horas
-- después de la creación (o de la última regeneración). El login la valida
-- (ver app/actions/auth.ts) y la limpia tras el primer inicio de sesión
-- exitoso.

alter table public.profiles
  add column if not exists temp_password_expires_at timestamptz;

comment on column public.profiles.temp_password_expires_at is
  'Vencimiento de la contraseña temporal autogenerada; null si no tiene una pendiente.';
