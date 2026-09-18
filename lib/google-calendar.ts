import "server-only";

/**
 * Helpers de OAuth 2.0 y Calendar API de Google, con fetch() directo — sin
 * el paquete "googleapis" (pesado, y esto solo necesita 5 endpoints REST).
 * Mismo criterio que lib/csv.ts: evitar una dependencia para algo que no la
 * necesita.
 */

const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.events"];

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}.`);
  return value;
}

// Sin esto, un fetch() a Google que nunca resuelve (red intermitente, DNS
// colgado, etc.) cuelga para siempre — nada en este archivo tenía timeout,
// así que una sola llamada atascada bloqueaba el render entero de la Agenda
// (la espera un Promise.all sin límite en app/(app)/agenda/page.tsx). Los
// callers ya tratan estas funciones como best-effort (try/catch → []), pero
// eso no sirve de nada si la promesa nunca llega a resolver o rechazar.
const FETCH_TIMEOUT_MS = 8_000;

export function buildGoogleAuthUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // Fuerza que Google reenvíe refresh_token también en una reconexión
    // (solo lo manda la PRIMERA vez que una cuenta autoriza, salvo esto).
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  /** Espacio-separado: los scopes que Google realmente otorgó, que pueden
   * ser menos de los pedidos (ver CALENDAR_SCOPE / hasCalendarScope abajo). */
  scope?: string;
};

/** Único scope que de verdad importa validar: sin este, la conexión "existe"
 * pero ninguna llamada a la API de Calendar va a funcionar. */
export const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";

/** true si el token trae el scope de Calendar — Google a veces devuelve
 * menos permisos de los pedidos (scope no agregado a la pantalla de
 * consentimiento, o una sesión de consentimiento vieja que no se refrescó),
 * y eso no es un error de la llamada, solo un token que no sirve para nada
 * de Calendar. Se valida explícito en vez de asumir que "llegó un
 * refresh_token" es suficiente. */
export function hasCalendarScope(tokens: TokenResponse): boolean {
  return (tokens.scope ?? "").split(/\s+/).includes(CALENDAR_SCOPE);
}

async function postToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token endpoint error (${res.status}): ${text}`);
  }
  return res.json();
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  return postToken(
    new URLSearchParams({
      code,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  );
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return postToken(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requireEnv("GOOGLE_CLIENT_ID"),
      client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  );
}

/**
 * Revoca el refresh token en Google (invalida también el access token
 * vigente que salió de él). "Desconectar" en el CRM antes solo borraba
 * nuestra fila — Google seguía viendo la app como autorizada del lado de
 * la cuenta, así que una reconexión podía heredar una sesión de
 * consentimiento vieja en vez de una limpia. Nunca lanza: si Google ya no
 * conoce el token (ya revocado a mano, por ejemplo) da igual, el objetivo
 * (que quede desconectado) ya se cumple.
 */
export async function revokeGoogleToken(refreshToken: string): Promise<void> {
  try {
    await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (err) {
    console.error("[revokeGoogleToken] Error:", err);
  }
}

export async function getGoogleUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return typeof data.email === "string" ? data.email : null;
}

export type CalendarEventInput = {
  summary: string;
  description?: string;
  startISO: string;
  endISO: string;
};

const CALENDAR_ID = "primary";

export type GoogleEventBlock = { id: string; startISO: string; endISO: string };

/**
 * Eventos del calendario en [timeMinISO, timeMaxISO). Se usa tanto para
 * detectar "reservas" sin cita en el CRM como para bloquear horarios
 * ocupados al agendar/editar — a propósito trae el id de cada evento (a
 * diferencia de la API de freeBusy, que solo da intervalos ocupado/libre
 * mezclados sin poder atribuirlos a un evento puntual), necesario para poder
 * excluir el propio evento espejo de una cita al revisar sus traslapes, y
 * para poder ligar una cita nueva a un evento ya existente sin duplicarlo.
 * Se descartan eventos de día completo (sin dateTime) porque no representan
 * un horario reservable.
 */
export async function listCalendarEvents(
  accessToken: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<GoogleEventBlock[]> {
  const params = new URLSearchParams({
    timeMin: timeMinISO,
    timeMax: timeMaxISO,
    singleEvents: "true",
    orderBy: "startTime",
  });
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events?${params.toString()}`,
    { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) },
  );
  if (!res.ok) throw new Error(`Google Calendar events.list error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  const items = (data.items ?? []) as Array<{
    id: string;
    start?: { dateTime?: string };
    end?: { dateTime?: string };
  }>;
  return items
    .filter((item) => item.start?.dateTime && item.end?.dateTime)
    .map((item) => ({ id: item.id, startISO: item.start!.dateTime!, endISO: item.end!.dateTime! }));
}

function eventPayload(event: CalendarEventInput, timeZone: string) {
  return {
    summary: event.summary,
    description: event.description,
    start: { dateTime: event.startISO, timeZone },
    end: { dateTime: event.endISO, timeZone },
  };
}

export async function createCalendarEvent(
  accessToken: string,
  event: CalendarEventInput,
  timeZone: string,
): Promise<string> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload(event, timeZone)),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );
  if (!res.ok) throw new Error(`Google Calendar create error (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return data.id as string;
}

/**
 * Devuelve false si el evento ya no existe en ese calendario (borrado a mano
 * en Google, o la cita cambió de doctora y el evento vive en OTRO
 * calendario) — el caller decide si crear uno nuevo en ese caso.
 */
export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: CalendarEventInput,
  timeZone: string,
): Promise<boolean> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventPayload(event, timeZone)),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );
  if (res.status === 404) return false;
  if (!res.ok) throw new Error(`Google Calendar update error (${res.status}): ${await res.text()}`);
  return true;
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${CALENDAR_ID}/events/${encodeURIComponent(eventId)}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    },
  );
  // 404/410: ya no existe — el resultado que queríamos, no un error.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Google Calendar delete error (${res.status}): ${await res.text()}`);
  }
}
