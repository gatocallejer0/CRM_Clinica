"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireScreen } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { combineClinicDateTime, formatClinicTime } from "@/lib/clinic-time";
import { rateLimit, getClientIp, RateLimitError } from "@/lib/rate-limit";
import { syncAppointmentToGoogleCalendar, getDoctorGoogleBusyBlocks } from "./google-calendar";
import { createSaleFromAttendedAppointment } from "./catalog";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * La sincronización con Google Calendar es best-effort a propósito: el CRM
 * es la fuente de verdad de la cita, así que un fallo de Google (token
 * vencido, API caída, etc.) nunca debe impedir que la cita se guarde.
 */
async function syncToGoogleCalendarSilently(appointmentId: string) {
  try {
    await syncAppointmentToGoogleCalendar(appointmentId);
  } catch (err) {
    console.error("[syncToGoogleCalendarSilently] Error:", err);
  }
}

/**
 * Junta el precio del servicio y el nombre de la doctora antes de crear el
 * cobro pendiente de una cita recién marcada "atendida" — para los dos
 * flujos (crear/editar) que no traen esos datos ya cargados de memoria (a
 * diferencia del auto-marcado en listAppointments, que sí los tiene del
 * select con join y arma el cobro directo). Best-effort, igual que la
 * sincronización con Google Calendar: nunca debe impedir que la cita se
 * guarde.
 */
async function createAttendanceSaleSilently(
  supabase: SupabaseClient,
  {
    appointmentId,
    patientId,
    serviceId,
    doctorId,
  }: { appointmentId: string; patientId: string; serviceId: string; doctorId: string },
) {
  try {
    const [{ data: service }, { data: doctor }] = await Promise.all([
      supabase.from("services").select("price").eq("id", serviceId).maybeSingle(),
      supabase.from("profiles").select("full_name").eq("id", doctorId).maybeSingle(),
    ]);

    await createSaleFromAttendedAppointment({
      appointmentId,
      patientId,
      serviceId,
      price: service?.price ?? 0,
      soldBy: doctorId,
      soldByName: doctor?.full_name ?? "Clínica",
    });
  } catch (err) {
    console.error("[createAttendanceSaleSilently] Error:", err);
  }
}

export type ServiceCategory = "prenatal" | "general" | "seguimiento";
export type AppointmentStatus = "confirmada" | "en_espera" | "atendida" | "cancelada";

export type Service = {
  id: string;
  name: string;
  category: ServiceCategory;
  duration_minutes: number;
  price: number | null;
};

export type DoctorOption = {
  id: string;
  full_name: string;
};

export type Appointment = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  patient_id: string;
  patient_name: string;
  doctor_id: string | null;
  doctor_name: string | null;
  service_id: string;
  service_name: string;
  service_category: ServiceCategory;
};

type AppointmentRow = {
  id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  patient_id: string;
  doctor: { id: string; full_name: string } | null;
  service: { id: string; name: string; category: ServiceCategory; price: number | null } | null;
};

export type OverlapConflict = {
  patientName: string;
  timeLabel: string;
};

/**
 * Citas que se traslapan con [scheduledAt, scheduledAt + durationMinutes)
 * para la misma doctora, excluyendo canceladas y (al editar) la propia cita.
 * Se restringe al día porque ninguna cita dura más de 240 min (ver
 * durationMinutes en los schemas de abajo), así que dos citas de días
 * distintos nunca se traslapan.
 */
async function findOverlaps(
  supabase: SupabaseClient,
  {
    doctorId,
    scheduledAt,
    durationMinutes,
    excludeId,
  }: { doctorId: string; scheduledAt: Date; durationMinutes: number; excludeId?: string },
): Promise<OverlapConflict[]> {
  const dayStart = new Date(scheduledAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("appointments")
    .select("id, scheduled_at, duration_minutes, patient_id")
    .eq("doctor_id", doctorId)
    .neq("status", "cancelada")
    .gte("scheduled_at", dayStart.toISOString())
    .lt("scheduled_at", dayEnd.toISOString());

  if (error || !data) return [];

  const newStart = scheduledAt.getTime();
  const newEnd = newStart + durationMinutes * 60000;

  const overlapping = data.filter((row) => {
    if (excludeId && row.id === excludeId) return false;
    const rowStart = new Date(row.scheduled_at).getTime();
    const rowEnd = rowStart + row.duration_minutes * 60000;
    return newStart < rowEnd && rowStart < newEnd;
  });

  const conflicts: OverlapConflict[] = [];

  if (overlapping.length > 0) {
    const patientIds = [...new Set(overlapping.map((r) => r.patient_id))];
    const namesByPatientId = new Map<string, string>();
    const { data: patients } = await supabase
      .from("patient_summary")
      .select("id, full_name")
      .in("id", patientIds);
    for (const p of patients ?? []) {
      namesByPatientId.set(p.id, p.full_name ?? "Paciente sin nombre");
    }

    conflicts.push(
      ...overlapping.map((row) => ({
        patientName: namesByPatientId.get(row.patient_id) ?? "Paciente sin nombre",
        timeLabel: formatClinicTime(new Date(row.scheduled_at)),
      })),
    );
  }

  // Bloqueos del Google Calendar de la doctora (si lo tiene conectado) —
  // no son citas del CRM, pero igual bloquean el horario. Al editar una
  // cita que ya tiene su propio evento espejo en Google, ese evento se
  // excluye — si no, la cita se traslaparía consigo misma. Falla en
  // silencio: getDoctorGoogleBusyBlocks nunca lanza.
  let excludeGoogleEventId: string | undefined;
  if (excludeId) {
    const { data: current } = await supabase
      .from("appointments")
      .select("google_event_id")
      .eq("id", excludeId)
      .maybeSingle();
    excludeGoogleEventId = current?.google_event_id ?? undefined;
  }

  const busyBlocks = await getDoctorGoogleBusyBlocks(
    doctorId,
    dayStart.toISOString(),
    dayEnd.toISOString(),
    excludeGoogleEventId,
  );
  const busyConflicts = busyBlocks.filter((block) => {
    const blockStart = new Date(block.startISO).getTime();
    const blockEnd = new Date(block.endISO).getTime();
    return newStart < blockEnd && blockStart < newEnd;
  });
  conflicts.push(
    ...busyConflicts.map((block) => ({
      patientName: "Bloqueado en su Google Calendar",
      timeLabel: formatClinicTime(new Date(block.startISO)),
    })),
  );

  return conflicts;
}

/** Público para el personal con acceso a Agenda; RLS filtra por rol. */
export async function listServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category, duration_minutes, price")
    .eq("active", true)
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export type PatientOption = {
  id: string;
  full_name: string;
  email: string;
};

/** Búsqueda de pacientes para el selector de "Nueva cita". */
export async function searchPatients(query: string): Promise<PatientOption[]> {
  const trimmed = query.trim().replace(/[,()]/g, "");
  if (!trimmed) return [];

  try {
    rateLimit(`search-patients:${await getClientIp()}`, { limit: 60, windowMs: 60_000 });
  } catch (err) {
    if (err instanceof RateLimitError) return [];
    throw err;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("patient_summary")
    .select("id, full_name, email")
    .or(`full_name.ilike.%${trimmed}%,email.ilike.%${trimmed}%`)
    .limit(8);

  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name ?? "Paciente sin nombre",
    email: p.email,
  }));
}

export async function listDoctors(): Promise<DoctorOption[]> {
  const supabase = await createClient();
  // El filtro por rol va explícito en la consulta (no solo en RLS): un
  // Admin también tiene permiso para leer todos los perfiles, así que sin
  // este `eq` vería recepción/admin mezclados en el selector de doctora.
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role:roles!inner(name)")
    .eq("active", true)
    .eq("role.name", "Doctor")
    .order("full_name")
    .returns<{ id: string; full_name: string }[]>();

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Citas en un rango [fromISO, toISO). RLS ya restringe a Admin/Doctor/Recepción. */
export async function listAppointments(fromISO: string, toISO: string): Promise<Appointment[]> {
  const supabase = await createClient();

  // `doctor:profiles(...)` usa el hint `!doctor_id` porque appointments
  // tiene dos FKs hacia profiles (doctor_id y created_by) — sin
  // desambiguar, PostgREST no sabe cuál de las dos usar.
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, scheduled_at, duration_minutes, status, notes, patient_id, doctor:profiles!doctor_id(id, full_name), service:services(id, name, category, price)",
    )
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO)
    .order("scheduled_at")
    .returns<AppointmentRow[]>();

  if (error) throw new Error(error.message);
  const rows = data ?? [];

  // Auto-marca como "atendida" las citas confirmadas/en espera cuyo horario
  // ya terminó — evita tener que hacerlo a mano en cada cita. El estado
  // sigue siendo editable después (p.ej. si en realidad se canceló o
  // reprogramó y no se alcanzó a corregir antes de que pasara la hora).
  const now = Date.now();
  const staleIds = rows
    .filter(
      (r) =>
        (r.status === "confirmada" || r.status === "en_espera") &&
        new Date(r.scheduled_at).getTime() + r.duration_minutes * 60000 < now,
    )
    .map((r) => r.id);

  if (staleIds.length > 0) {
    const { error: updateError } = await supabase
      .from("appointments")
      .update({ status: "atendida" })
      .in("id", staleIds);

    if (updateError) {
      console.error("[listAppointments] Error auto-marcando atendida:", updateError.message);
    } else {
      const staleIdSet = new Set(staleIds);
      const attendedRows = rows.filter((row) => staleIdSet.has(row.id));
      for (const row of attendedRows) {
        row.status = "atendida";
      }

      // El cobro se arma directo con los datos ya cargados en este mismo
      // select (con join) — a diferencia de updateAppointment/createAppointment,
      // que sí necesitan una consulta aparte porque solo tienen los IDs.
      // Este es el ÚNICO camino de marcado automático (por horario vencido,
      // sin que nadie la toque) — a diferencia del marcado manual, el cobro
      // nace directo como "pagado" (efectivo por defecto, corregible después).
      await Promise.all(
        attendedRows
          .filter((row) => row.service)
          .map((row) =>
            createSaleFromAttendedAppointment({
              appointmentId: row.id,
              patientId: row.patient_id,
              serviceId: row.service!.id,
              price: row.service!.price ?? 0,
              soldBy: row.doctor?.id ?? null,
              soldByName: row.doctor?.full_name ?? "Clínica",
              status: "pagado",
              paymentMethod: "efectivo",
            }).catch((err) =>
              console.error("[listAppointments] Error creando cobro automático:", err),
            ),
          ),
      );
    }
  }

  // patient_summary es una vista (sin FK declarada hacia appointments), así
  // que no se puede embeber en el select de arriba: se consulta aparte y se
  // mergea en memoria por patient_id.
  const patientIds = [...new Set(rows.map((r) => r.patient_id))];
  const namesByPatientId = new Map<string, string>();
  if (patientIds.length > 0) {
    const { data: patients, error: patientsError } = await supabase
      .from("patient_summary")
      .select("id, full_name")
      .in("id", patientIds);

    if (patientsError) throw new Error(patientsError.message);
    for (const p of patients ?? []) {
      namesByPatientId.set(p.id, p.full_name ?? "Paciente sin nombre");
    }
  }

  return rows.map((row) => ({
    id: row.id,
    scheduled_at: row.scheduled_at,
    duration_minutes: row.duration_minutes,
    status: row.status,
    notes: row.notes,
    patient_id: row.patient_id,
    patient_name: namesByPatientId.get(row.patient_id) ?? "Paciente sin nombre",
    doctor_id: row.doctor?.id ?? null,
    doctor_name: row.doctor?.full_name ?? null,
    service_id: row.service?.id ?? "",
    service_name: row.service?.name ?? "",
    service_category: row.service?.category ?? "general",
  }));
}

/**
 * patients ya no tiene columna full_name (0004_dynamic_form.sql la movió a
 * patient_answers, junto con el resto de campos del formulario dinámico) —
 * el nombre se guarda como respuesta a la pregunta "full_name" del catálogo
 * form_fields, igual que hace registerPatient(). Compartido entre
 * createAppointment y assignPatientToGoogleReservation.
 *
 * Si ya existe una paciente con ese correo (ej. ya se había agendado antes,
 * o ya se registró por el formulario) reutiliza ese mismo registro en vez
 * de crear uno duplicado — a diferencia del formulario público, esta acción
 * la hace personal ya autenticado, así que no hay riesgo de que alguien sin
 * permisos toque datos de otra paciente.
 */
async function createNewPatientRow(
  supabase: SupabaseClient,
  name: string,
  email: string,
): Promise<{ id: string } | { error: string }> {
  const { data: existingPatient, error: lookupError } = await supabase
    .from("patients")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("[createNewPatientRow] Error buscando paciente existente:", lookupError.message);
    return { error: "No se pudo verificar si la paciente ya existe." };
  }

  if (existingPatient) {
    return { id: existingPatient.id };
  }

  const { data: newPatient, error: patientError } = await supabase
    .from("patients")
    .insert({ email })
    .select("id")
    .single();

  if (patientError) {
    console.error("[createNewPatientRow] Error creando paciente:", patientError.message);
    return { error: "No se pudo crear la paciente." };
  }

  const { data: nameField } = await supabase
    .from("form_fields")
    .select("id")
    .eq("key", "full_name")
    .maybeSingle();

  if (nameField) {
    const { error: answerError } = await supabase.from("patient_answers").insert({
      patient_id: newPatient.id,
      field_id: nameField.id,
      value: name,
    });
    if (answerError) {
      console.error("[createNewPatientRow] Error guardando nombre:", answerError.message);
    }
  }

  return { id: newPatient.id };
}

const CreateAppointmentSchema = z
  .object({
    patientMode: z.enum(["existing", "new"]),
    patientId: z.string().uuid().optional(),
    newPatientName: z.string().trim().min(2).optional(),
    newPatientEmail: z.string().trim().email().optional(),
    doctorId: z.string().uuid({ error: "Selecciona una doctora." }),
    serviceId: z.string().uuid({ error: "Selecciona un servicio." }),
    date: z.string().min(1, { error: "Selecciona una fecha." }),
    time: z.string().min(1, { error: "Selecciona una hora." }),
    durationMinutes: z.coerce.number().int().min(5).max(240),
    status: z.enum(["confirmada", "en_espera", "atendida", "cancelada"]),
    notes: z.string().trim().optional(),
    force: z.enum(["true", "false"]).transform((v) => v === "true"),
  })
  .refine((data) => (data.patientMode === "existing" ? !!data.patientId : true), {
    error: "Selecciona una paciente.",
    path: ["patientId"],
  })
  .refine((data) => (data.patientMode === "new" ? !!data.newPatientName : true), {
    error: "Escribe el nombre de la paciente.",
    path: ["newPatientName"],
  })
  .refine((data) => (data.patientMode === "new" ? !!data.newPatientEmail : true), {
    error: "Escribe un correo válido.",
    path: ["newPatientEmail"],
  });

export type AppointmentFormState =
  | {
      error?: string;
      success?: boolean;
      overlap?: OverlapConflict[];
    }
  | undefined;

export async function createAppointment(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  const profile = await requireScreen("agenda");

  const parsed = CreateAppointmentSchema.safeParse({
    patientMode: formData.get("patientMode") || "existing",
    patientId: formData.get("patientId") || undefined,
    newPatientName: formData.get("newPatientName") || undefined,
    newPatientEmail: formData.get("newPatientEmail") || undefined,
    doctorId: formData.get("doctorId"),
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    time: formData.get("time"),
    durationMinutes: formData.get("durationMinutes") || 30,
    status: formData.get("status") || "confirmada",
    notes: formData.get("notes"),
    force: formData.get("force") || "false",
  });

  if (!parsed.success) {
    return { error: "Revisa los datos de la cita." };
  }

  const supabase = await createClient();

  const scheduledAtForOverlap = combineClinicDateTime(parsed.data.date, parsed.data.time);
  if (!parsed.data.force) {
    const overlap = await findOverlaps(supabase, {
      doctorId: parsed.data.doctorId,
      scheduledAt: scheduledAtForOverlap,
      durationMinutes: parsed.data.durationMinutes,
    });
    if (overlap.length > 0) return { overlap };
  }

  let patientId = parsed.data.patientId;
  if (parsed.data.patientMode === "new") {
    const result = await createNewPatientRow(
      supabase,
      parsed.data.newPatientName!,
      parsed.data.newPatientEmail!,
    );
    if ("error" in result) return { error: result.error };
    patientId = result.id;
  }

  const { data: newAppointment, error } = await supabase
    .from("appointments")
    .insert({
      patient_id: patientId,
      doctor_id: parsed.data.doctorId,
      service_id: parsed.data.serviceId,
      scheduled_at: scheduledAtForOverlap.toISOString(),
      duration_minutes: parsed.data.durationMinutes,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createAppointment] Supabase error:", error.message);
    return { error: "No se pudo agendar la cita." };
  }

  if (parsed.data.status === "atendida") {
    await createAttendanceSaleSilently(supabase, {
      appointmentId: newAppointment.id,
      patientId: patientId!,
      serviceId: parsed.data.serviceId,
      doctorId: parsed.data.doctorId,
    });
  }

  await syncToGoogleCalendarSilently(newAppointment.id);

  revalidatePath("/agenda");
  return { success: true };
}

const UpdateAppointmentSchema = z.object({
  id: z.string().uuid(),
  doctorId: z.string().uuid({ error: "Selecciona una doctora." }),
  serviceId: z.string().uuid({ error: "Selecciona un servicio." }),
  date: z.string().min(1, { error: "Selecciona una fecha." }),
  time: z.string().min(1, { error: "Selecciona una hora." }),
  durationMinutes: z.coerce.number().int().min(5).max(240),
  status: z.enum(["confirmada", "en_espera", "atendida", "cancelada"]),
  notes: z.string().trim().optional(),
  force: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function updateAppointment(
  _prevState: AppointmentFormState,
  formData: FormData,
): Promise<AppointmentFormState> {
  await requireScreen("agenda");

  const parsed = UpdateAppointmentSchema.safeParse({
    id: formData.get("id"),
    doctorId: formData.get("doctorId"),
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    time: formData.get("time"),
    durationMinutes: formData.get("durationMinutes") || 30,
    status: formData.get("status") || "confirmada",
    notes: formData.get("notes"),
    force: formData.get("force") || "false",
  });

  if (!parsed.success) {
    return { error: "Revisa los datos de la cita." };
  }

  const supabase = await createClient();
  const scheduledAt = combineClinicDateTime(parsed.data.date, parsed.data.time);

  if (!parsed.data.force) {
    const overlap = await findOverlaps(supabase, {
      doctorId: parsed.data.doctorId,
      scheduledAt,
      durationMinutes: parsed.data.durationMinutes,
      excludeId: parsed.data.id,
    });
    if (overlap.length > 0) return { overlap };
  }

  // Se necesita el estado (y la paciente) de ANTES del update para saber si
  // esto es una transición hacia "atendida" — y no, por ejemplo, guardar de
  // nuevo una cita que ya estaba atendida (eso no debe crear un segundo cobro).
  const { data: before } = await supabase
    .from("appointments")
    .select("status, patient_id")
    .eq("id", parsed.data.id)
    .maybeSingle();

  const { error } = await supabase
    .from("appointments")
    .update({
      doctor_id: parsed.data.doctorId,
      service_id: parsed.data.serviceId,
      scheduled_at: scheduledAt.toISOString(),
      duration_minutes: parsed.data.durationMinutes,
      status: parsed.data.status,
      notes: parsed.data.notes || null,
    })
    .eq("id", parsed.data.id);

  if (error) {
    console.error("[updateAppointment] Supabase error:", error.message);
    return { error: "No se pudo actualizar la cita." };
  }

  if (before && before.status !== "atendida" && parsed.data.status === "atendida") {
    await createAttendanceSaleSilently(supabase, {
      appointmentId: parsed.data.id,
      patientId: before.patient_id,
      serviceId: parsed.data.serviceId,
      doctorId: parsed.data.doctorId,
    });
  }

  await syncToGoogleCalendarSilently(parsed.data.id);

  revalidatePath("/agenda");
  return { success: true };
}

/** Reagendado rápido por arrastre en el calendario: solo cambia scheduled_at. */
export async function rescheduleAppointment(
  id: string,
  scheduledAtISO: string,
  force = false,
): Promise<{ error?: string; overlap?: OverlapConflict[] }> {
  await requireScreen("agenda");
  const supabase = await createClient();

  if (!force) {
    const { data: current } = await supabase
      .from("appointments")
      .select("doctor_id, duration_minutes")
      .eq("id", id)
      .single();

    if (current?.doctor_id) {
      const overlap = await findOverlaps(supabase, {
        doctorId: current.doctor_id,
        scheduledAt: new Date(scheduledAtISO),
        durationMinutes: current.duration_minutes,
        excludeId: id,
      });
      if (overlap.length > 0) return { overlap };
    }
  }

  const { error } = await supabase
    .from("appointments")
    .update({ scheduled_at: scheduledAtISO })
    .eq("id", id);

  if (error) return { error: error.message };

  await syncToGoogleCalendarSilently(id);

  revalidatePath("/agenda");
  return {};
}

// Google exige que el id de un evento use solo minúsculas a-v y dígitos
// 0-9 (codificación base32hex, ver la doc de events.insert), 5 a 1024
// caracteres. Se valida acá — el único punto donde un id de evento entra al
// sistema desde el cliente — porque este valor termina interpolado en la
// URL de updateCalendarEvent/deleteCalendarEvent; aceptar cualquier string
// hubiera permitido manipular esa URL con un id ajeno o con caracteres que
// alteran la ruta.
const GOOGLE_EVENT_ID_PATTERN = /^[a-v0-9]{5,1024}$/;

const AssignReservationSchema = z
  .object({
    googleEventId: z.string().regex(GOOGLE_EVENT_ID_PATTERN, { error: "Reserva inválida." }),
    doctorId: z.string().uuid(),
    startISO: z.string().min(1),
    endISO: z.string().min(1),
    patientMode: z.enum(["existing", "new"]),
    patientId: z.string().uuid().optional(),
    newPatientName: z.string().trim().min(2).optional(),
    newPatientEmail: z.string().trim().email().optional(),
    serviceId: z.string().uuid({ error: "Selecciona un servicio." }),
    notes: z.string().trim().optional(),
  })
  .refine((data) => (data.patientMode === "existing" ? !!data.patientId : true), {
    error: "Selecciona una paciente.",
    path: ["patientId"],
  })
  .refine((data) => (data.patientMode === "new" ? !!data.newPatientName : true), {
    error: "Escribe el nombre de la paciente.",
    path: ["newPatientName"],
  })
  .refine((data) => (data.patientMode === "new" ? !!data.newPatientEmail : true), {
    error: "Escribe un correo válido.",
    path: ["newPatientEmail"],
  });

export type AssignReservationFormState = { error?: string; success?: boolean } | undefined;

/**
 * Asigna paciente a un evento que ya existe en el Google Calendar de la
 * doctora (una "reserva" detectada por listGoogleReservations). A propósito
 * NO llama a la API de Google: el evento ya existe allá, así que solo se
 * guarda su id en la cita nueva — cualquier edición futura desde el flujo
 * normal (updateAppointment) sí sincroniza, actualizando o borrando ese
 * mismo evento en vez de crear uno duplicado.
 */
export async function assignPatientToGoogleReservation(
  _prevState: AssignReservationFormState,
  formData: FormData,
): Promise<AssignReservationFormState> {
  const profile = await requireScreen("agenda");

  const parsed = AssignReservationSchema.safeParse({
    googleEventId: formData.get("googleEventId"),
    doctorId: formData.get("doctorId"),
    startISO: formData.get("startISO"),
    endISO: formData.get("endISO"),
    patientMode: formData.get("patientMode") || "existing",
    patientId: formData.get("patientId") || undefined,
    newPatientName: formData.get("newPatientName") || undefined,
    newPatientEmail: formData.get("newPatientEmail") || undefined,
    serviceId: formData.get("serviceId"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: "Revisa los datos de la cita." };
  }

  const supabase = await createClient();

  let patientId = parsed.data.patientId;
  if (parsed.data.patientMode === "new") {
    const result = await createNewPatientRow(
      supabase,
      parsed.data.newPatientName!,
      parsed.data.newPatientEmail!,
    );
    if ("error" in result) return { error: result.error };
    patientId = result.id;
  }

  const durationMinutes = Math.round(
    (new Date(parsed.data.endISO).getTime() - new Date(parsed.data.startISO).getTime()) / 60000,
  );

  const { error } = await supabase.from("appointments").insert({
    patient_id: patientId,
    doctor_id: parsed.data.doctorId,
    service_id: parsed.data.serviceId,
    scheduled_at: parsed.data.startISO,
    duration_minutes: durationMinutes,
    status: "confirmada",
    notes: parsed.data.notes || null,
    created_by: profile.id,
    google_event_id: parsed.data.googleEventId,
  });

  if (error) {
    console.error("[assignPatientToGoogleReservation] Supabase error:", error.message);
    return { error: "No se pudo asignar la reserva." };
  }

  revalidatePath("/agenda");
  return { success: true };
}
