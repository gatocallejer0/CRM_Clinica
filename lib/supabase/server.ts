import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Server Actions and Route
 * Handlers. Reads/writes the auth session via Next.js cookies.
 *
 * NOTE: Server Components cannot write cookies, so `setAll` is wrapped in a
 * try/catch. Session refresh in that case is handled by `proxy.ts`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — session refresh is handled
            // by proxy.ts instead.
          }
        },
      },
    },
  );
}

/**
 * Supabase client with the `service_role` key. This bypasses Row Level
 * Security, so it must ONLY be imported from server-only code (Server
 * Actions / Route Handlers) that has already verified the caller is an
 * Admin. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
