import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ALL_SCREEN_KEYS, type ScreenKey } from "@/lib/auth/screens";

export type Profile = {
  id: string;
  full_name: string;
  active: boolean;
  temp_password_expires_at: string | null;
  role: {
    id: string;
    name: string;
  };
};

/**
 * Returns the signed-in user's profile (with role) or null if there is no
 * session. Use this in Server Components / Server Actions — never trust a
 * role coming from the client.
 *
 * Wrapped in React `cache()` so that calling this multiple times during the
 * same request (e.g. once in a layout and again in the page it renders)
 * only hits Supabase Auth + the `profiles` table once, instead of once per
 * call. This is per-request only — it does not leak between users/requests.
 */
export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, active, temp_password_expires_at, role:roles(id, name)")
    .eq("id", user.id)
    .single<Profile>();

  return profile ?? null;
});

/**
 * Ensures the current user is signed in and has one of `allowedRoles`.
 * Redirects to /login (no session) or / (wrong role) otherwise.
 *
 * New roles can be added later purely as data (rows in `roles`) — callers
 * just pass the new role name here wherever it should have access.
 */
export async function requireRole(allowedRoles: string[]): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.active || !allowedRoles.includes(profile.role.name)) {
    redirect("/");
  }

  return profile;
}

/**
 * Pantallas habilitadas para un rol (Admin Center > Roles y permisos).
 * Cacheada por request igual que getCurrentProfile. El rol Admin nunca tiene
 * filas en `role_screens` — ver getAllowedScreens, que lo trata aparte.
 */
export const getRoleScreens = cache(async (roleId: string): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data } = await supabase.from("role_screens").select("screen_key").eq("role_id", roleId);
  return new Set((data ?? []).map((row) => row.screen_key as string));
});

/** Pantallas visibles para un perfil: todas si es Admin, si no las de su rol. */
export async function getAllowedScreens(profile: Profile): Promise<Set<string>> {
  if (profile.role.name === "Admin") return new Set(ALL_SCREEN_KEYS);
  return getRoleScreens(profile.role.id);
}

/**
 * Redirige a "/" (Dashboard) solo si el perfil de verdad puede verlo — con
 * roles personalizados, un rol sin la pantalla "dashboard" haría que "/" se
 * redirigiera a sí mismo en bucle (queda en blanco). /sin-acceso no exige
 * ninguna pantalla, así que siempre es un destino seguro.
 */
async function redirectToSafeHome(profile: Profile): Promise<never> {
  const canSeeDashboard =
    profile.active &&
    (profile.role.name === "Admin" || (await getRoleScreens(profile.role.id)).has("dashboard"));
  redirect(canSeeDashboard ? "/" : "/sin-acceso");
}

/**
 * Ensures the current user is signed in and active, without checking any
 * specific role or screen — used by app/(app)/layout.tsx, which wraps every
 * page. With roles now extensible (Admin Center > Roles y permisos), a fixed
 * role-name list doesn't make sense at that level; each page underneath
 * enforces its own screen via requireScreen.
 */
export async function requireActiveSession(): Promise<Profile> {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.active) {
    await redirectToSafeHome(profile);
  }

  return profile;
}

/**
 * Ensures the current user can see `screenKey` (Admin Center > Roles y
 * permisos). Admin always passes — it never has rows in `role_screens` and
 * is treated as having every screen, so it can never lock itself out.
 * Redirects to /login (no session) or a safe fallback (screen not allowed).
 */
export async function requireScreen(screenKey: ScreenKey): Promise<Profile> {
  const profile = await requireActiveSession();

  if (profile.role.name !== "Admin") {
    const allowed = await getRoleScreens(profile.role.id);
    if (!allowed.has(screenKey)) {
      await redirectToSafeHome(profile);
    }
  }

  return profile;
}
