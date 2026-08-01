# CRM Clínica

CRM para la gestión de una clínica: pacientes, agendamiento y más módulos
que se irán agregando de forma incremental. Esta primera fase entrega el
proyecto base y el **login con roles** (Admin, Doctor, Recepción).

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) + TypeScript
- [Supabase](https://supabase.com) (Postgres + Auth) vía `@supabase/ssr`
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com)
- Deploy: [Vercel](https://vercel.com) (app) + Supabase (base de datos / auth)

> **Nota:** Next.js 16 renombró "Middleware" a **Proxy**. El archivo raíz de
> este proyecto es `proxy.ts` (no `middleware.ts`).

## Setup

### 1. Crear el proyecto en Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor**, ejecuta el contenido de `supabase/migrations/0001_init.sql`
   (crea las tablas `roles` y `profiles`, con RLS y los 3 roles iniciales).
3. En **Settings → API**, copia la URL del proyecto, la `anon key` y la
   `service_role key`.

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

Completa `.env.local` con los valores del paso anterior. `SUPABASE_SERVICE_ROLE_KEY`
es secreta: solo se usa en Server Actions ya protegidas por rol Admin — nunca
la expongas en código de cliente ni la commitees.

### 3. Crear el primer usuario Admin

Como no hay registro público, el primer usuario Admin se crea manualmente:

1. En Supabase → **Authentication → Users → Add user**, crea un usuario con
   email/contraseña (marca "Auto Confirm User").
2. En **SQL Editor**, crea su perfil con rol Admin:

   ```sql
   insert into public.profiles (id, full_name, role_id, active)
   values (
     '<uuid del usuario creado>',
     'Nombre Apellido',
     (select id from public.roles where name = 'Admin'),
     true
   );
   ```

A partir de aquí, ese usuario puede entrar a `/admin/usuarios` y crear el
resto del personal (Doctores, Recepción) desde la interfaz.

### 4. Levantar el proyecto

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) — te redirige a
`/login` si no hay sesión.

## Estructura relevante

```
app/
├── login/page.tsx           Formulario de login
├── admin/usuarios/page.tsx  Alta y listado de usuarios (solo Admin)
├── page.tsx                 Dashboard (placeholder, protegido)
└── actions/
    ├── auth.ts              Server Actions: login / logout
    └── users.ts             Server Actions: crear/listar usuarios (Admin)
lib/
├── supabase/{client,server,proxy}.ts   Clientes Supabase (browser/server/proxy)
└── auth/roles.ts                       getCurrentProfile / requireRole
supabase/migrations/0001_init.sql       Esquema: roles, profiles, RLS
proxy.ts                                Protección de rutas + refresco de sesión
```

## Roles

Los roles viven en la tabla `roles` (no en un enum), para poder agregar
nuevos roles de seguridad sin necesidad de migraciones de esquema — solo
insertando una fila nueva y usándola en `requireRole([...])`.

## Deploy

1. Sube el repo a GitHub.
2. Importa el repo en [Vercel](https://vercel.com/new).
3. Configura las mismas variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) en el
   proyecto de Vercel.
