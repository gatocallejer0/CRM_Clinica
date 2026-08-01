import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  full_name: string;
  active: boolean;
  role: {
    id: string;
    name: string;
  };
};

/**
 * Returns the signed-in user's profile (with role) or null if there is no
 * session. Use this in Server Components / Server Actions — never trust a
 * role coming from the client.
 */
export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, active, role:roles(id, name)")
    .eq("id", user.id)
    .single<Profile>();

  return profile ?? null;
}

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
