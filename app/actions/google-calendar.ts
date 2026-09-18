"use server";

import { revalidatePath } from "next/cache";
import { requireScreen } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";
import {
  refreshAccessToken,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  revokeGoogleToken,
  type GoogleEventBlock,
} from "@/lib/google-calendar";
import { CLINIC_TZ } from "@/lib/clinic-time";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Access token vigente para la doctora, renovándolo si está por vencer.
 * Devuelve null si no tiene Google Calendar conectado — el caller decide
 * qué hacer (sincronizar es best-effort, y el chequeo de bloqueos
 * simplemente no bloquea nada si no hay token).
 */
async function getValidAccessToken(
  admin: SupabaseClient,
  doctorId: string,
): Promise<string | null> {
  const { data: connection } = await admin
    .from("google_calendar_connections")
    .select("access_token, refresh_token, token_expires_at")
    .eq("doctor_id", doctorId)
    .maybeSingle();

  if (!connection) return null;

  const expiresInMs = new Date(connection.token_expires_at).getTime() - Date.now();
  if (expiresInMs > 60_000) return connection.access_token;

  try {
    const refreshed = await refreshAccessToken(connection.refresh_token);
    await admin
      .from("google_calendar_connections")
      .update({
        access_token: refreshed.access_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq("doctor_id", doctorId);

    return refreshed.access_token;
  } catch (err) {
    // Google rechaza el refresh token de forma permanente (revocado desde la
    // cuenta de Google, o expirado por inactividad) — reintentar no sirve de
    // nada con un token muerto. Se borra la conexión para que "Cuenta" deje
    // de mostrar "Conectado" y la doctora sepa que debe volver a
    // autorizar, en vez de quedar con un badge verde engañoso mientras la
    // sincronización real falla en silencio. Un error 5xx/de red sí puede
    // ser transitorio, así que solo se borra ante un rechazo 4xx (invalid_grant y similares).
    const message = err instanceof Error ? err.message : String(err);
    if (/Google token endpoint error \(4\d\d\)/.test(message)) {
      await admin.from("google_calendar_connections").delete().eq("doctor_id", doctorId);
    }
    throw err;
  }
}

/**
 * Bloques ocupados del Google Calendar de una doctora en un rango — para
 * marcar esos horarios como no disponibles en la Agenda sin necesitar que
 * la cita exista todavía en el CRM. `excludeEventId` se usa al editar una
 * cita que ya tiene su propio evento espejo en Google: sin esto, la cita se
 * "traslaparía consigo misma" (su propio evento siempre está ocupado en su
 * propio horario). Nunca lanza: si la doctora no conectó su calendario, o
 * Google falla, simplemente no hay bloqueos que reportar (no se le puede
 * pedir a este chequeo que tumbe el guardado de una cita).
 */
export async function getDoctorGoogleBusyBlocks(
  doctorId: string,
  rangeStartISO: string,
  rangeEndISO: string,
  excludeEventId?: string,
): Promise<GoogleEventBlock[]> {
  // A diferencia de sus hermanos en este archivo (listGoogleReservations,
  // getGoogleCalendarStatus, etc.), esta función no tenía ningún chequeo de
  // sesión/pantalla — al estar exportada desde un archivo "use server",
  // Next.js igual genera un endpoint público invocable con un POST directo,
  // sin pasar por el caller interno (findOverlaps) que hoy sí exige la
  // pantalla "agenda" antes de llegar acá. Confiar en que "nadie más la
  // importa del lado del cliente" no es un límite de seguridad real (así lo
  // dice la propia doc de Next.js sobre Server Actions) — se agrega el
  // mismo requireScreen("agenda") que usan sus hermanos.
  await requireScreen("agenda");

  const admin = createAdminClient();

  try {
    const accessToken = await getValidAccessToken(admin, doctorId);
    if (!accessToken) return [];
    const events = await listCalendarEvents(accessToken, rangeStartISO, rangeEndISO);
    return excludeEventId ? events.filter((e) => e.id !== excludeEventId) : events;
  } catch (err) {
    console.error("[getDoctorGoogleBusyBlocks] Error:", err);
    return [];
  }
}

export type GoogleReservation = {
  googleEventId: string;
  doctorId: string;
  doctorName: string;
  startISO: string;
  endISO: string;
};

/**
 * Eventos del Google Calendar de las doctoras conectadas que todavía no
 * están ligados a ninguna cita del CRM — se muestran en la Agenda como
 * "reserva sin asignar" para que el personal le asigne paciente sin volver a
 * escribir fecha/hora, y sin crear un evento duplicado en Google (la cita
 * resultante se liga al id de este mismo evento en vez de crear uno nuevo).
 */
export async function listGoogleReservations(
  rangeStartISO: string,
  rangeEndISO: string,
): Promise<GoogleReservation[]> {
  await requireScreen("agenda");
  const admin = createAdminClient();

  const { data: connections } = await admin.from("google_calendar_connections").select("doctor_id");
  if (!connections || connections.length === 0) return [];

  const { data: doctors } = await admin
    .from("profiles")
    .select("id, full_name, role:roles!inner(name)")
    .in(
      "id",
      connections.map((c) => c.doctor_id),
    )
    .eq("role.name", "Doctor")
    .returns<{ id: string; full_name: string }[]>();
  if (!doctors || doctors.length === 0) return [];

  const { data: linkedRows } = await admin
    .from("appointments")
    .select("google_event_id")
    .not("google_event_id", "is", null)
    .gte("scheduled_at", rangeStartISO)
    .lt("scheduled_at", rangeEndISO);
  const linkedEventIds = new Set((linkedRows ?? []).map((r) => r.google_event_id as string));

  const reservations: GoogleReservation[] = [];
  for (const doctor of doctors) {
    try {
      const accessToken = await getValidAccessToken(admin, doctor.id);
      if (!accessToken) continue;
      const events = await listCalendarEvents(accessToken, rangeStartISO, rangeEndISO);
      for (const event of events) {
        if (linkedEventIds.has(event.id)) continue;
        reservations.push({
          googleEventId: event.id,
          doctorId: doctor.id,
          doctorName: doctor.full_name,
          startISO: event.startISO,
          endISO: event.endISO,
        });
      }
    } catch (err) {
      console.error("[listGoogleReservations] Error para doctora", doctor.id, err);
    }
  }
  return reservations;
}

export type GoogleCalendarStatus = { connected: boolean; googleEmail: string | null };

/** Estado de conexión de la usuaria actual (no de una doctora arbitraria — siempre "yo"). */
export async function getGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  const profile = await requireScreen("cuenta");
  const admin = createAdminClient();

  const { data } = await admin
    .from("google_calendar_connections")
    .select("google_email")
    .eq("doctor_id", profile.id)
    .maybeSingle();

  return { connected: !!data, googleEmail: data?.google_email ?? null };
}

export async function disconnectGoogleCalendar(): Promise<{ error?: string }> {
  const profile = await requireScreen("cuenta");
  const admin = createAdminClient();

  // Revoca en Google antes de borrar nuestra fila — si no, "desconectar" acá
  // no cambia nada del lado de Google, y una reconexión posterior puede
  // heredar la sesión de consentimiento vieja en vez de una realmente nueva
  // (justo lo que causó que un scope agregado después no se reflejara).
  const { data: connection } = await admin
    .from("google_calendar_connections")
    .select("refresh_token")
    .eq("doctor_id", profile.id)
    .maybeSingle();
  if (connection) await revokeGoogleToken(connection.refresh_token);

  const { error } = await admin
    .from("google_calendar_connections")
    .delete()
    .eq("doctor_id", profile.id);

  if (error) {
    console.error("[disconnectGoogleCalendar] Supabase error:", error.message);
    return { error: "No se pudo desconectar el calendario." };
  }

  revalidatePath("/cuenta");
  return {};
}

type AppointmentForSync = {
  patient_id: string;
  doctor_id: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  google_event_id: string | null;
  service: { name: string } | { name: string }[] | null;
};

/**
 * Empuja el estado actual de una cita a Google Calendar (crea, actualiza o
 * borra el evento espejo según status/google_event_id). Best-effort a
 * propósito: el CRM es la fuente de verdad, así que un fallo acá nunca debe
 * tumbar el guardado real de la cita — el caller la envuelve en try/catch.
 *
 * Límite conocido: si se reasigna la cita a otra doctora, el evento viejo
 * queda huérfano en el calendario de la doctora anterior (no se borra solo)
 * — se crea uno nuevo en el calendario de la nueva doctora sin problema.
 */
export async function syncAppointmentToGoogleCalendar(appointmentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: appt } = await admin
    .from("appointments")
    .select(
      "patient_id, doctor_id, scheduled_at, duration_minutes, status, google_event_id, service:services(name)",
    )
    .eq("id", appointmentId)
    .maybeSingle<AppointmentForSync>();

  if (!appt || !appt.doctor_id) return;

  const accessToken = await getValidAccessToken(admin, appt.doctor_id);
  if (!accessToken) return; // la doctora no conectó su Google Calendar

  if (appt.status === "cancelada") {
    if (appt.google_event_id) {
      await deleteCalendarEvent(accessToken, appt.google_event_id);
      await admin.from("appointments").update({ google_event_id: null }).eq("id", appointmentId);
    }
    return;
  }

  const { data: patient } = await admin
    .from("patient_summary")
    .select("full_name")
    .eq("id", appt.patient_id)
    .maybeSingle();

  const service = Array.isArray(appt.service) ? appt.service[0] : appt.service;
  const start = new Date(appt.scheduled_at);
  const end = new Date(start.getTime() + appt.duration_minutes * 60_000);

  const event = {
    summary: `${service?.name ?? "Consulta"} — ${patient?.full_name ?? "Paciente"}`,
    description: "Creado desde CRM Clínica.",
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };

  if (appt.google_event_id) {
    const updated = await updateCalendarEvent(accessToken, appt.google_event_id, event, CLINIC_TZ);
    if (updated) return;
    // El evento ya no existe en el calendario de ESTA doctora (borrado a
    // mano, o la cita se reasignó) — se crea uno nuevo, como si no hubiera
    // google_event_id.
  }

  const eventId = await createCalendarEvent(accessToken, event, CLINIC_TZ);
  await admin.from("appointments").update({ google_event_id: eventId }).eq("id", appointmentId);
}
