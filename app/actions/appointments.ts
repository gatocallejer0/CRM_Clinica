"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { combineClinicDateTime } from "@/lib/clinic-time";

const SCHEDULING_ROLES = ["Admin", "Doctor", "Recepción"];

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
  status: AppointmentStatus;
  notes: string | null;
  patient_id: string;
  doctor: { id: string; full_name: string } | null;
  service: { id: string; name: string; category: ServiceCategory } | null;
};

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
      "id, scheduled_at, status, notes, patient_id, doctor:profiles!doctor_id(id, full_name), service:services(id, name, category)",
    )
    .gte("scheduled_at", fromISO)
    .lt("scheduled_at", toISO)
    .order("scheduled_at")
    .returns<AppointmentRow[]>();

  if (error) throw new Error(error.message);
  const rows = data ?? [];

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

const CreateAppointmentSchema = z.object({
  patientId: z.string().uuid({ error: "Selecciona una paciente." }),
  doctorId: z.string().uuid({ error: "Selecciona una doctora." }),
  serviceId: z.string().uuid({ error: "Selecciona un servicio." }),
  date: z.string().min(1, { error: "Selecciona una fecha." }),
  time: z.string().min(1, { error: "Selecciona una hora." }),
  status: z.enum(["confirmada", "en_espera", "atendida", "cancelada"]),
  notes: z.string().trim().optional(),
});

export type CreateAppointmentState =
  | {
      error?: string;
      success?: boolean;
    }
  | undefined;

export async function createAppointment(
  _prevState: CreateAppointmentState,
  formData: FormData,
): Promise<CreateAppointmentState> {
  const profile = await requireRole(SCHEDULING_ROLES);

  const parsed = CreateAppointmentSchema.safeParse({
    patientId: formData.get("patientId"),
    doctorId: formData.get("doctorId"),
    serviceId: formData.get("serviceId"),
    date: formData.get("date"),
    time: formData.get("time"),
    status: formData.get("status") || "confirmada",
    notes: formData.get("notes"),
  });

  if (!parsed.success) {
    return { error: "Revisa los datos de la cita." };
  }

  const supabase = await createClient();
  const scheduledAt = combineClinicDateTime(parsed.data.date, parsed.data.time);

  const { error } = await supabase.from("appointments").insert({
    patient_id: parsed.data.patientId,
    doctor_id: parsed.data.doctorId,
    service_id: parsed.data.serviceId,
    scheduled_at: scheduledAt.toISOString(),
    status: parsed.data.status,
    notes: parsed.data.notes || null,
    created_by: profile.id,
  });

  if (error) {
    console.error("[createAppointment] Supabase error:", error.message);
    return { error: "No se pudo agendar la cita." };
  }

  revalidatePath("/agenda");
  return { success: true };
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
): Promise<{ error?: string }> {
  await requireRole(SCHEDULING_ROLES);
  const supabase = await createClient();

  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/agenda");
  return {};
}
