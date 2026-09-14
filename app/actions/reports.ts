"use server";

import { requireScreen } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";
import {
  toClinicDateKey,
  formatClinicMonthLabel,
  combineClinicDateTime,
  addDays,
} from "@/lib/clinic-time";
import type { AppointmentStatus } from "./appointments";

// ── Operativo ────────────────────────────────────────────────────────────
// Tabla de detalle (una fila por cita) + línea de resumen por estado, según
// el diseño de referencia — sin tarjetas/gráficas (esas van al Dashboard).

export type OperationalAppointmentRow = {
  id: string;
  scheduledAt: string;
  patientName: string;
  patientEmail: string;
  /** true si esta es la primera cita histórica (no cancelada) de la paciente. */
  isNewPatient: boolean;
  serviceName: string;
  status: AppointmentStatus;
};

export type OperationalReport = {
  summary: Record<AppointmentStatus, number>;
  rows: OperationalAppointmentRow[];
};

export type OperationalFilters = {
  /** yyyy-mm-dd, inclusive. null = sin límite inferior. */
  fromKey: string | null;
  /** yyyy-mm-dd, inclusive. null = sin límite superior. */
  toKey: string | null;
  status: AppointmentStatus | "all";
  serviceId: string | null;
};

export async function getOperationalReport(filters: OperationalFilters): Promise<OperationalReport> {
  await requireScreen("reportes");
  // Cliente admin: este reporte cruza citas/pacientes más allá de lo que la
  // sesión del usuario podría leer por RLS (esas policies están pensadas
  // para Agenda/Expediente, no para Reportes) — el gate real es
  // requireScreen de arriba.
  const supabase = createAdminClient();

  const from = filters.fromKey ? combineClinicDateTime(filters.fromKey, "00:00") : null;
  const to = filters.toKey ? addDays(combineClinicDateTime(filters.toKey, "00:00"), 1) : null;

  let query = supabase
    .from("appointments")
    .select("id, scheduled_at, status, patient_id, service:services(name)")
    .order("scheduled_at", { ascending: false })
    .limit(500);
  if (from) query = query.gte("scheduled_at", from.toISOString());
  if (to) query = query.lt("scheduled_at", to.toISOString());
  if (filters.serviceId) query = query.eq("service_id", filters.serviceId);

  type Row = {
    id: string;
    scheduled_at: string;
    status: AppointmentStatus;
    patient_id: string;
    service: { name: string } | { name: string }[] | null;
  };

  const { data, error } = await query.returns<Row[]>();
  if (error) throw new Error(error.message);
  const allRows = data ?? [];

  const summary: Record<AppointmentStatus, number> = {
    confirmada: 0,
    en_espera: 0,
    atendida: 0,
    cancelada: 0,
  };
  for (const row of allRows) summary[row.status] += 1;

  const filteredRows = filters.status === "all" ? allRows : allRows.filter((r) => r.status === filters.status);

  const patientIds = [...new Set(filteredRows.map((r) => r.patient_id))];
  const patientById = new Map<string, { name: string; email: string }>();
  if (patientIds.length > 0) {
    const { data: patients } = await supabase
      .from("patient_summary")
      .select("id, full_name, email")
      .in("id", patientIds);
    for (const p of patients ?? []) {
      patientById.set(p.id, { name: p.full_name ?? "Paciente sin nombre", email: p.email ?? "" });
    }
  }

  // "Nueva" = esta cita es la primera cita histórica (no cancelada) de la
  // paciente — se compara contra TODO su historial, no solo el rango
  // filtrado, para no marcar como "nueva" una cita antigua solo porque el
  // filtro excluye visitas anteriores.
  const firstApptIdByPatient = new Map<string, string>();
  if (patientIds.length > 0) {
    const { data: history } = await supabase
      .from("appointments")
      .select("id, patient_id, scheduled_at")
      .in("patient_id", patientIds)
      .neq("status", "cancelada")
      .order("scheduled_at", { ascending: true });
    for (const a of history ?? []) {
      if (!firstApptIdByPatient.has(a.patient_id)) firstApptIdByPatient.set(a.patient_id, a.id);
    }
  }

  const rows = filteredRows.map((r) => {
    const service = Array.isArray(r.service) ? r.service[0] : r.service;
    const patient = patientById.get(r.patient_id);
    return {
      id: r.id,
      scheduledAt: r.scheduled_at,
      patientName: patient?.name ?? "Paciente sin nombre",
      patientEmail: patient?.email ?? "",
      isNewPatient: firstApptIdByPatient.get(r.patient_id) === r.id,
      serviceName: service?.name ?? "—",
      status: r.status,
    };
  });

  return { summary, rows };
}

// ── Pacientes ────────────────────────────────────────────────────────────
// Pestaña "Detalle" (todos los datos del formulario) y pestaña "Recurrencia"
// (mensual + pacientes en riesgo de abandono).

export type DateFilters = {
  /** yyyy-mm-dd, inclusive. null = sin límite inferior. */
  fromKey: string | null;
  /** yyyy-mm-dd, inclusive. null = sin límite superior. */
  toKey: string | null;
};

export type PatientsMonthlyRow = {
  monthKey: string;
  monthLabel: string;
  nuevas: number;
  recurrentes: number;
  total: number;
  recurrencyPct: number;
};

export type PatientsSummaryReport = {
  months: PatientsMonthlyRow[];
};

/**
 * "Nueva" vs "recurrente" se decide por cita, no por registro: una paciente
 * es "nueva" en el mes de su PRIMERA cita histórica (sin cancelar); en
 * cualquier mes posterior con actividad, es "recurrente". Por eso se trae
 * el historial completo de citas (sin filtrar por rango) para calcular esa
 * primera cita, aunque la tabla que se muestra sí respete el rango.
 */
export async function getPatientsSummaryReport(filters: DateFilters): Promise<PatientsSummaryReport> {
  await requireScreen("reportes");
  const supabase = createAdminClient();

  const from = filters.fromKey ? combineClinicDateTime(filters.fromKey, "00:00") : null;
  const to = filters.toKey ? addDays(combineClinicDateTime(filters.toKey, "00:00"), 1) : null;

  const { data: allAppts, error: apptError } = await supabase
    .from("appointments")
    .select("patient_id, scheduled_at")
    .neq("status", "cancelada");
  if (apptError) throw new Error(apptError.message);

  const firstApptMonthByPatient = new Map<string, string>();
  for (const a of allAppts ?? []) {
    const monthKey = toClinicDateKey(new Date(a.scheduled_at)).slice(0, 7);
    const prev = firstApptMonthByPatient.get(a.patient_id);
    if (!prev || monthKey < prev) firstApptMonthByPatient.set(a.patient_id, monthKey);
  }

  const fromTime = from?.getTime() ?? null;
  const toTime = to?.getTime() ?? null;
  const inRange = (allAppts ?? []).filter((a) => {
    const t = new Date(a.scheduled_at).getTime();
    return (fromTime === null || t >= fromTime) && (toTime === null || t < toTime);
  });

  const monthBuckets = new Map<string, Set<string>>();
  for (const a of inRange) {
    const monthKey = toClinicDateKey(new Date(a.scheduled_at)).slice(0, 7);
    if (!monthBuckets.has(monthKey)) monthBuckets.set(monthKey, new Set());
    monthBuckets.get(monthKey)!.add(a.patient_id);
  }

  const months = [...monthBuckets.entries()]
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([monthKey, patientSet]) => {
      let nuevas = 0;
      for (const patientId of patientSet) {
        if (firstApptMonthByPatient.get(patientId) === monthKey) nuevas += 1;
      }
      const total = patientSet.size;
      const recurrentes = total - nuevas;
      return {
        monthKey,
        monthLabel: formatClinicMonthLabel(combineClinicDateTime(`${monthKey}-01`, "00:00")),
        nuevas,
        recurrentes,
        total,
        recurrencyPct: total > 0 ? Math.round((recurrentes / total) * 100) : 0,
      };
    });

  return { months };
}

// ── Pacientes en riesgo de abandono ────────────────────────────────────────
// Ya tuvieron al menos una cita (no cancelada), pero ninguna en los últimos
// ABANDONMENT_THRESHOLD_DAYS días — candidatas a una llamada de seguimiento.

export type AtRiskPatientRow = {
  patientId: string;
  name: string;
  email: string;
  lastVisit: string;
  daysSinceLastVisit: number;
};

const ABANDONMENT_THRESHOLD_DAYS = 90;

export async function getAtRiskPatients(): Promise<AtRiskPatientRow[]> {
  await requireScreen("reportes");
  const supabase = createAdminClient();

  const { data: appts, error: apptError } = await supabase
    .from("appointments")
    .select("patient_id, scheduled_at")
    .neq("status", "cancelada");
  if (apptError) throw new Error(apptError.message);

  const lastVisitByPatient = new Map<string, number>();
  for (const a of appts ?? []) {
    const t = new Date(a.scheduled_at).getTime();
    const prev = lastVisitByPatient.get(a.patient_id);
    if (prev === undefined || t > prev) lastVisitByPatient.set(a.patient_id, t);
  }

  const now = Date.now();
  const thresholdMs = ABANDONMENT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const atRiskIds = [...lastVisitByPatient.entries()].filter(([, t]) => now - t > thresholdMs);
  if (atRiskIds.length === 0) return [];

  const { data: patients } = await supabase
    .from("patient_summary")
    .select("id, full_name, email")
    .in(
      "id",
      atRiskIds.map(([id]) => id),
    );
  const patientById = new Map((patients ?? []).map((p) => [p.id, p]));

  return atRiskIds
    .map(([patientId, lastVisitMs]) => {
      const patient = patientById.get(patientId);
      return {
        patientId,
        name: patient?.full_name ?? "Paciente sin nombre",
        email: patient?.email ?? "",
        lastVisit: new Date(lastVisitMs).toISOString(),
        daysSinceLastVisit: Math.floor((now - lastVisitMs) / (24 * 60 * 60 * 1000)),
      };
    })
    .sort((a, b) => b.daysSinceLastVisit - a.daysSinceLastVisit);
}

// Tabla completa: una fila por paciente, una columna por cada pregunta
// activa del formulario de registro (form_fields/patient_answers, ver
// 0004_dynamic_form.sql — patients ya no tiene columnas fijas de datos).

export type PatientsDataReport = {
  fields: { key: string; label: string }[];
  rows: {
    patientId: string;
    email: string;
    createdAt: string;
    answers: Record<string, string>;
  }[];
};

export async function getPatientsDataReport(filters: DateFilters): Promise<PatientsDataReport> {
  await requireScreen("reportes");
  const supabase = createAdminClient();

  const from = filters.fromKey ? combineClinicDateTime(filters.fromKey, "00:00") : null;
  const to = filters.toKey ? addDays(combineClinicDateTime(filters.toKey, "00:00"), 1) : null;

  let patientsQuery = supabase.from("patients").select("id, email, created_at").order("created_at", { ascending: false });
  if (from) patientsQuery = patientsQuery.gte("created_at", from.toISOString());
  if (to) patientsQuery = patientsQuery.lt("created_at", to.toISOString());

  const [{ data: patients, error: patientsError }, { data: fields, error: fieldsError }] = await Promise.all([
    patientsQuery,
    supabase
      .from("form_fields")
      .select("id, key, label, section, sort_order")
      .eq("active", true)
      .order("section")
      .order("sort_order"),
  ]);
  if (patientsError) throw new Error(patientsError.message);
  if (fieldsError) throw new Error(fieldsError.message);

  const patientIds = (patients ?? []).map((p) => p.id);
  const { data: answers, error: answersError } =
    patientIds.length > 0
      ? await supabase.from("patient_answers").select("patient_id, field_id, value").in("patient_id", patientIds)
      : { data: [], error: null };
  if (answersError) throw new Error(answersError.message);

  const fieldKeyById = new Map((fields ?? []).map((f) => [f.id, f.key]));
  const answersByPatient = new Map<string, Record<string, string>>();
  for (const row of answers ?? []) {
    const key = fieldKeyById.get(row.field_id);
    if (!key) continue;
    if (!answersByPatient.has(row.patient_id)) answersByPatient.set(row.patient_id, {});
    answersByPatient.get(row.patient_id)![key] = row.value;
  }

  return {
    fields: (fields ?? []).map((f) => ({ key: f.key, label: f.label })),
    rows: (patients ?? []).map((p) => ({
      patientId: p.id,
      email: p.email,
      createdAt: p.created_at,
      answers: answersByPatient.get(p.id) ?? {},
    })),
  };
}

// ── Auditoría ────────────────────────────────────────────────────────────

export type AuditReportEntry = {
  id: string;
  table_name: string;
  action: "create" | "update" | "delete";
  summary: string;
  performed_by_name: string;
  created_at: string;
};

export async function getAuditReport(
  filters: DateFilters,
  tableName: string | null,
): Promise<AuditReportEntry[]> {
  await requireScreen("admin.auditoria");
  const from = filters.fromKey ? combineClinicDateTime(filters.fromKey, "00:00") : null;
  const to = filters.toKey ? addDays(combineClinicDateTime(filters.toKey, "00:00"), 1) : null;

  const supabase = createAdminClient();
  let query = supabase
    .from("audit_log")
    .select("id, table_name, action, summary, performed_by_name, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (from) query = query.gte("created_at", from.toISOString());
  if (to) query = query.lt("created_at", to.toISOString());
  if (tableName) query = query.eq("table_name", tableName);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}
