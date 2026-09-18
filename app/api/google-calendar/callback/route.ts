import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { exchangeCodeForTokens, getGoogleUserEmail, hasCalendarScope } from "@/lib/google-calendar";

const STAFF_ROLES = ["Admin", "Doctor", "Recepción"];

function redirectToAccount(request: NextRequest, query: string) {
  const response = NextResponse.redirect(new URL(`/cuenta${query}`, request.nextUrl.origin));
  response.cookies.delete("gcal_oauth_state");
  return response;
}

export async function GET(request: NextRequest) {
  const profile = await requireRole(STAFF_ROLES);

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const oauthError = request.nextUrl.searchParams.get("error");
  const savedState = request.cookies.get("gcal_oauth_state")?.value;

  if (oauthError) return redirectToAccount(request, "?gcal=denegado");
  if (!code || !state || !savedState || state !== savedState) {
    return redirectToAccount(request, "?gcal=error");
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/google-calendar/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Sin refresh_token no hay forma de renovar el acceso más adelante —
    // pasa si Google no re-consultó consentimiento (no debería, mandamos
    // prompt=consent, pero se valida por las dudas).
    if (!tokens.refresh_token) return redirectToAccount(request, "?gcal=error");

    // Que haya refresh_token no significa que el token sirva para algo: si
    // el scope de Calendar no viene incluido (pantalla de consentimiento sin
    // ese scope agregado, o una sesión de consentimiento vieja), la
    // conexión se guardaría como "Conectada" pero cada sincronización
    // fallaría en silencio con 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT — mejor
    // rechazarla acá, con un mensaje que sí explica qué falta.
    if (!hasCalendarScope(tokens)) {
      console.error(
        "[google-calendar/callback] Token sin scope de Calendar. Scopes recibidos:",
        tokens.scope || "(vacío)",
      );
      return redirectToAccount(request, "?gcal=sin_permiso_calendario");
    }

    const googleEmail = await getGoogleUserEmail(tokens.access_token);

    const admin = createAdminClient();
    const { error } = await admin.from("google_calendar_connections").upsert({
      doctor_id: profile.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      google_email: googleEmail,
    });

    if (error) {
      console.error("[google-calendar/callback] Supabase error:", error.message);
      return redirectToAccount(request, "?gcal=error");
    }
  } catch (err) {
    console.error("[google-calendar/callback] Error:", err);
    return redirectToAccount(request, "?gcal=error");
  }

  return redirectToAccount(request, "?gcal=conectado");
}
