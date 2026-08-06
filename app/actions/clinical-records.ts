"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

const CLINICAL_ROLES = ["Admin", "Doctor"];

export type PatientListItem = {
  id: string;
  full_name: string;
  email: string;
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
  doctor_name: string | null;
};

export type PatientDetail = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  age: string | null;
  blood_type: string | null;
  allergies: string | null;
  records: ClinicalRecord[];
};

/** Lista de pacientes para el panel izquierdo del Expediente. Solo Admin/Doctor (RLS de clinical_records). */
export async function listPatientsForExpediente(): Promise<PatientListItem[]> {
  await requireRole(CLINICAL_ROLES);
  const supabase = await createClient();

  const { data: patients, error } = await supabase
    .from("patient_summary")
    .select("id, full_name, email")
    .order("full_name", { nullsFirst: false });

  if (error) throw new Error(error.message);

  const { data: records, error: recordsError } = await supabase
    .from("clinical_records")
    .select("patient_id, record_date")
    .order("record_date", { ascending: false });

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
    last_visit: lastVisitByPatientId.get(p.id) ?? null,
  }));
}

type ClinicalRecordRow = Omit<ClinicalRecord, "doctor_name"> & {
  doctor: { full_name: string } | null;
};

export async function getPatientDetail(patientId: string): Promise<PatientDetail | null> {
  await requireRole(CLINICAL_ROLES);
  const supabase = await createClient();

  const { data: patient, error } = await supabase
    .from("patient_summary")
    .select("id, full_name, email, phone, age, blood_type, allergies")
    .eq("id", patientId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!patient) return null;

  const { data: records, error: recordsError } = await supabase
    .from("clinical_records")
    .select(
      "id, record_date, reason, diagnosis, evolution_notes, medical_orders, medication, medication_instructions, weight_kg, height_cm, last_menstrual_period, doctor:profiles!doctor_id(full_name)",
    )
    .eq("patient_id", patientId)
    .order("record_date", { ascending: false })
    .returns<ClinicalRecordRow[]>();

  if (recordsError) throw new Error(recordsError.message);

  return {
    id: patient.id,
    full_name: patient.full_name ?? "Paciente sin nombre",
    email: patient.email,
    phone: patient.phone,
    age: patient.age,
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
      doctor_name: r.doctor?.full_name ?? null,
    })),
  };
}

const emptyToUndefined = (val: unknown) =>
  typeof val === "string" && val.trim() === "" ? undefined : val;

const CreateClinicalRecordSchema = z.object({
  patientId: z.string().uuid({ error: "Paciente inválida." }),
  doctorId: z.string().uuid().optional(),
  reason: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  diagnosis: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  evolutionNotes: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  medicalOrders: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  medication: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  medicationInstructions: z.preprocess(emptyToUndefined, z.string().trim().optional()),
  weightKg: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
  heightCm: z.preprocess(emptyToUndefined, z.coerce.number().positive().optional()),
  lastMenstrualPeriod: z.preprocess(emptyToUndefined, z.string().trim().optional()),
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
  const profile = await requireRole(CLINICAL_ROLES);

  const parsed = CreateClinicalRecordSchema.safeParse({
    patientId: formData.get("patientId"),
    doctorId: formData.get("doctorId") || undefined,
    reason: formData.get("reason"),
    diagnosis: formData.get("diagnosis"),
    evolutionNotes: formData.get("evolutionNotes"),
    medicalOrders: formData.get("medicalOrders"),
    medication: formData.get("medication"),
    medicationInstructions: formData.get("medicationInstructions"),
    weightKg: formData.get("weightKg"),
    heightCm: formData.get("heightCm"),
    lastMenstrualPeriod: formData.get("lastMenstrualPeriod"),
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
    medication: parsed.data.medication ?? null,
    medication_instructions: parsed.data.medicationInstructions ?? null,
    weight_kg: parsed.data.weightKg ?? null,
    height_cm: parsed.data.heightCm ?? null,
    last_menstrual_period: parsed.data.lastMenstrualPeriod ?? null,
    created_by: profile.id,
  });

  if (error) {
    console.error("[createClinicalRecord] Supabase error:", error.message);
    return { error: "No se pudo guardar el registro clínico." };
  }

  revalidatePath("/expediente");
  return { success: true };
}
