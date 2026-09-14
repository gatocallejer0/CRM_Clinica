"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireScreen } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { listPatientDocuments, type ClinicalDocument } from "./clinical-documents";

export type PatientListItem = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  national_id: string | null;
  nit: string | null;
  birth_date: string | null;
  age: string | null;
  emergency_contact: string | null;
  last_visit: string | null;
};

export type ClinicalRecord = {
  id: string;
  record_date: string;
  reason: string | null;
  diagnosis: string | null;
  evolution_notes: string | null;
  medical_orders: string | null;
  medication: string | null;
  medication_instructions: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  last_menstrual_period: string | null;
  estimated_due_date: string | null;
  ultrasound_date: string | null;
  ultrasound_weeks: number | null;
  ultrasound_days: number | null;
  doctor_name: string | null;
};

export type PatientDetail = {
  id: string;
  full_name: string;
  email: string;
  national_id: string | null;
  phone: string | null;
  age: string | null;
  birth_date: string | null;
  emergency_contact: string | null;
  nit: string | null;
  blood_type: string | null;
  allergies: string | null;
  records: ClinicalRecord[];
  documents: ClinicalDocument[];
};

/** Lista de pacientes para el panel izquierdo del Expediente. Solo Admin/Doctor (RLS de clinical_records). */
export async function listPatientsForExpediente(): Promise<PatientListItem[]> {
  await requireScreen("pacientes");
  const supabase = await createClient();

  const [
    { data: patients, error },
    { data: records, error: recordsError },
  ] = await Promise.all([
    supabase
      .from("patient_summary")
      .select("id, full_name, email, phone, national_id, nit, birth_date, age, emergency_contact")
      .order("full_name", { nullsFirst: false }),
    supabase
      .from("clinical_records")
      .select("patient_id, record_date")
      .order("record_date", { ascending: false }),
  ]);

  if (error) throw new Error(error.message);
  if (recordsError) throw new Error(recordsError.message);

  const lastVisitByPatientId = new Map<string, string>();
  for (const r of records ?? []) {
    if (!lastVisitByPatientId.has(r.patient_id)) {
      lastVisitByPatientId.set(r.patient_id, r.record_date);
    }
  }

  return (patients ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name ?? "Paciente sin nombre",
    email: p.email,
    phone: p.phone,
    national_id: p.national_id,
    nit: p.nit,
    birth_date: p.birth_date,
    age: p.age,
    emergency_contact: p.emergency_contact,
    last_visit: lastVisitByPatientId.get(p.id) ?? null,
  }));
}

type ClinicalRecordRow = Omit<ClinicalRecord, "doctor_name"> & {
  doctor: { full_name: string } | null;
};

export async function getPatientDetail(patientId: string): Promise<PatientDetail | null> {
  await requireScreen("pacientes");
  const supabase = await createClient();

  const [
    { data: patient, error },
    { data: records, error: recordsError },
    documents,
  ] = await Promise.all([
    supabase
      .from("patient_summary")
      .select(
        "id, full_name, email, national_id, phone, age, birth_date, emergency_contact, nit, blood_type, allergies",
      )
      .eq("id", patientId)
      .maybeSingle(),
    supabase
      .from("clinical_records")
      .select(
        "id, record_date, reason, diagnosis, evolution_notes, medical_orders, medication, medication_instructions, weight_kg, height_cm, last_menstrual_period, estimated_due_date, ultrasound_date, ultrasound_weeks, ultrasound_days, doctor:profiles!doctor_id(full_name)",
      )
      .eq("patient_id", patientId)
      .order("record_date", { ascending: false })
      .returns<ClinicalRecordRow[]>(),
    listPatientDocuments(patientId),
  ]);

  if (error) throw new Error(error.message);
  if (!patient) return null;
  if (recordsError) throw new Error(recordsError.message);

  return {
    id: patient.id,
    full_name: patient.full_name ?? "Paciente sin nombre",
    email: patient.email,
    national_id: patient.national_id,
    phone: patient.phone,
    age: patient.age,
    birth_date: patient.birth_date,
    emergency_contact: patient.emergency_contact,
    nit: patient.nit,
    blood_type: patient.blood_type,
    allergies: patient.allergies,
    records: (records ?? []).map((r) => ({
      id: r.id,
      record_date: r.record_date,
      reason: r.reason,
      diagnosis: r.diagnosis,
      evolution_notes: r.evolution_notes,
      medical_orders: r.medical_orders,
      medication: r.medication,
      medication_instructions: r.medication_instructions,
      weight_kg: r.weight_kg,
      height_cm: r.height_cm,
      last_menstrual_period: r.last_menstrual_period,
      estimated_due_date: r.estimated_due_date,
      ultrasound_date: r.ultrasound_date,
      ultrasound_weeks: r.ultrasound_weeks,
      ultrasound_days: r.ultrasound_days,
      doctor_name: r.doctor?.full_name ?? null,
    })),
    documents,
  };
}

const emptyToUndefined = (val: unknown) =>
  val == null || (typeof val === "string" && val.trim() === "") ? undefined : val;

const CreateClinicalRecordSchema = z.object({
  patientId: z.string().uuid({ error: "Paciente inválida." }),
  doctorId: z.string().uuid().optional(),
  reason: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  diagnosis: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  evolutionNotes: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  medicalOrders: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  prescription: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  weightKg: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
  heightCm: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
  lastMenstrualPeriod: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  estimatedDueDate: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  ultrasoundDate: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  ultrasoundWeeks: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(42).optional()),
  ultrasoundDays: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).max(6).optional()),
});

export type CreateClinicalRecordState =
  | {
      error?: string;
      success?: boolean;
    }
  | undefined;

export async function createClinicalRecord(
  _prevState: CreateClinicalRecordState,
  formData: FormData,
): Promise<CreateClinicalRecordState> {
  const profile = await requireScreen("pacientes");

  const parsed = CreateClinicalRecordSchema.safeParse({
    patientId: formData.get("patientId"),
    doctorId: formData.get("doctorId") || undefined,
    reason: formData.get("reason"),
    diagnosis: formData.get("diagnosis"),
    evolutionNotes: formData.get("evolutionNotes"),
    medicalOrders: formData.get("medicalOrders"),
    prescription: formData.get("prescription"),
    weightKg: formData.get("weightKg"),
    heightCm: formData.get("heightCm"),
    lastMenstrualPeriod: formData.get("lastMenstrualPeriod"),
    estimatedDueDate: formData.get("estimatedDueDate"),
    ultrasoundDate: formData.get("ultrasoundDate"),
    ultrasoundWeeks: formData.get("ultrasoundWeeks"),
    ultrasoundDays: formData.get("ultrasoundDays"),
  });

  if (!parsed.success) {
    return { error: "Revisa los datos del registro." };
  }

  const doctorId = parsed.data.doctorId ?? (profile.role.name === "Doctor" ? profile.id : null);

  const supabase = await createClient();
  const { error } = await supabase.from("clinical_records").insert({
    patient_id: parsed.data.patientId,
    doctor_id: doctorId,
    reason: parsed.data.reason ?? null,
    diagnosis: parsed.data.diagnosis ?? null,
    evolution_notes: parsed.data.evolutionNotes ?? null,
    medical_orders: parsed.data.medicalOrders ?? null,
    medication: parsed.data.prescription ?? null,
    weight_kg: parsed.data.weightKg ?? null,
    height_cm: parsed.data.heightCm ?? null,
    last_menstrual_period: parsed.data.lastMenstrualPeriod ?? null,
    estimated_due_date: parsed.data.estimatedDueDate ?? null,
    ultrasound_date: parsed.data.ultrasoundDate ?? null,
    ultrasound_weeks: parsed.data.ultrasoundWeeks ?? null,
    ultrasound_days: parsed.data.ultrasoundDays ?? null,
    created_by: profile.id,
  });

  if (error) {
    console.error("[createClinicalRecord] Supabase error:", error.message);
    return { error: "No se pudo guardar el registro clínico." };
  }

  revalidatePath("/expediente");
  return { success: true };
}

export type PrescriptionPrintData = {
  patientName: string;
  doctorName: string | null;
  recordDate: string;
  prescription: string;
};

/** Datos para la vista imprimible de una receta. Null si el registro no existe o no tiene receta. */
export async function getClinicalRecordForPrint(recordId: string): Promise<PrescriptionPrintData | null> {
  await requireScreen("pacientes");
  const supabase = await createClient();

  const { data: record, error } = await supabase
    .from("clinical_records")
    .select("record_date, medication, patient_id, doctor:profiles!doctor_id(full_name)")
    .eq("id", recordId)
    .maybeSingle<{
      record_date: string;
      medication: string | null;
      patient_id: string;
      doctor: { full_name: string } | null;
    }>();

  if (error) throw new Error(error.message);
  if (!record || !record.medication) return null;

  const { data: patient, error: patientError } = await supabase
    .from("patient_summary")
    .select("full_name")
    .eq("id", record.patient_id)
    .maybeSingle();

  if (patientError) throw new Error(patientError.message);

  return {
    patientName: patient?.full_name ?? "Paciente sin nombre",
    doctorName: record.doctor?.full_name ?? null,
    recordDate: record.record_date,
    prescription: record.medication,
  };
}
