import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/registro-paciente"];

/**
 * Refreshes the Supabase auth session on every request and redirects
 * unauthenticated users away from private routes. Called from the root
 * `proxy.ts` (Next.js 16 renamed "Middleware" to "Proxy").
 *
 * This is an OPTIMISTIC check only (reads the session cookie, no DB call),
 * per Next.js guidance — see node_modules/next/dist/docs/01-app/02-guides/authentication.md.
 * Role-based authorization for /admin still happens server-side per page.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (err) {
    // A corrupt/stale session cookie (e.g. left over from testing with a
    // different Supabase key) makes getUser() throw instead of returning
    // null. Treat it as "no session" and wipe the bad cookies so the app
    // self-heals instead of flapping between logged-in/out on every request
    // (which manifests as ERR_TOO_MANY_REDIRECTS in the browser).
    console.error("[proxy] supabase.auth.getUser() failed, clearing session cookies:", err);
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) request.cookies.delete(name);
    });
    response = NextResponse.next({ request });
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-")) response.cookies.delete(name);
    });
  }

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.delete("redirectTo");
    return NextResponse.redirect(url);
  }

  return response;
}
