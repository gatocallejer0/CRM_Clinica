"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, RateLimitError } from "@/lib/rate-limit";
import { requireScreen } from "@/lib/auth/roles";

const EmailSchema = z.email({ error: "Ingresa un correo válido." });

export type PatientRegistrationState =
  | {
      error?: string;
      success?: boolean;
    }
  | undefined;

/**
 * Público (sin sesión): registra a una paciente vía la función SECURITY
 * DEFINER `register_patient` (ver supabase/migrations/0004_dynamic_form.sql),
 * único punto de entrada del rol `anon` a `patients` / `patient_answers`.
 *
 * Las respuestas se arman dinámicamente a partir de los campos del catálogo
 * `form_fields` (el <form> los nombra con `field.key`), en vez de una lista
 * fija de parámetros: la función en la base valida cuáles están activos, son
 * obligatorios o tienen opciones válidas.
 */
export async function registerPatient(
  _prevState: PatientRegistrationState,
  formData: FormData,
): Promise<PatientRegistrationState> {
  const emailResult = EmailSchema.safeParse(formData.get("email"));
  if (!emailResult.success) {
    return { error: "Ingresa un correo válido." };
  }

  try {
    rateLimit(`register-patient:${await getClientIp()}`, { limit: 5, windowMs: 10 * 60_000 });
  } catch (err) {
    if (err instanceof RateLimitError) return { error: err.message };
    throw err;
  }

  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key === "email" || typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed !== "") answers[key] = trimmed;
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_patient", {
    p_email: emailResult.data,
    p_answers: answers,
  });

  if (error) {
    console.error("[registerPatient] Supabase rpc error:", error.message);
    // register_patient() solo lanza excepciones con mensaje pensado para la
    // paciente (correo inválido, pregunta obligatoria, correo ya
    // registrado) — mostrarlo tal cual en vez de un genérico que lo tapa.
    return { error: error.message || "No se pudo completar el registro. Verifica los datos e intenta de nuevo." };
  }

  return { success: true };
}

export type UpdatePatientState =
  | {
      error?: string;
      success?: boolean;
    }
  | undefined;

/**
 * Admin/Doctor: obtiene el correo y todas las respuestas guardadas de una
 * paciente (catálogo dinámico), para precargar la ficha editable completa.
 */
export async function getPatientFicha(
  patientId: string,
): Promise<{ email: string; answers: Record<string, string> } | null> {
  await requireScreen("pacientes");
  const supabase = await createClient();

  const [{ data: patient, error: patientError }, { data: rows, error: answersError }] = await Promise.all([
    supabase.from("patients").select("email").eq("id", patientId).maybeSingle(),
    supabase
      .from("patient_answers")
      .select("value, field:form_fields(key)")
      .eq("patient_id", patientId)
      .returns<{ value: string; field: { key: string } | null }[]>(),
  ]);

  if (patientError) throw new Error(patientError.message);
  if (!patient) return null;
  if (answersError) throw new Error(answersError.message);

  const answers: Record<string, string> = {};
  for (const row of rows ?? []) {
    if (row.field) answers[row.field.key] = row.value;
  }

  return { email: patient.email, answers };
}

/**
 * Admin/Doctor: edita la ficha completa de una paciente ya registrada —
 * correo + cualquier campo activo del catálogo dinámico presente en el
 * formulario que llame a esta acción (el diálogo rápido "Editar paciente"
 * solo envía un puñado de campos; la ficha completa los envía todos).
 */
export async function updatePatientFicha(
  _prevState: UpdatePatientState,
  formData: FormData,
): Promise<UpdatePatientState> {
  await requireScreen("pacientes");

  const patientIdResult = z.uuid({ error: "Paciente inválido." }).safeParse(formData.get("patientId"));
  if (!patientIdResult.success) {
    return { error: "Paciente inválido." };
  }
  const patientId = patientIdResult.data;

  const supabase = await createClient();

  const emailRaw = formData.get("email");
  if (typeof emailRaw === "string" && emailRaw.trim()) {
    const emailResult = EmailSchema.safeParse(emailRaw.trim());
    if (!emailResult.success) return { error: "Ingresa un correo válido." };
    const { error: emailError } = await supabase
      .from("patients")
      .update({ email: emailResult.data })
      .eq("id", patientId);
    if (emailError) return { error: emailError.message };
  }

  const { data: fields, error: fieldsError } = await supabase
    .from("form_fields")
    .select("id, key, field_type, required")
    .eq("active", true);
  if (fieldsError) return { error: fieldsError.message };

  const upserts: { patient_id: string; field_id: string; value: string }[] = [];
  const clearFieldIds: string[] = [];

  for (const field of fields ?? []) {
    if (!formData.has(field.key)) continue;
    const raw = formData.get(field.key);
    const value = typeof raw === "string" ? raw.trim() : "";

    if (field.required && !value) {
      return { error: `La pregunta "${field.key}" es obligatoria.` };
    }

    if (value) {
      upserts.push({ patient_id: patientId, field_id: field.id, value });
    } else {
      clearFieldIds.push(field.id);
    }
  }

  if (upserts.length > 0) {
    const { error } = await supabase
      .from("patient_answers")
      .upsert(upserts, { onConflict: "patient_id,field_id" });
    if (error) return { error: error.message };
  }

  if (clearFieldIds.length > 0) {
    const { error } = await supabase
      .from("patient_answers")
      .delete()
      .eq("patient_id", patientId)
      .in("field_id", clearFieldIds);
    if (error) return { error: error.message };
  }

  revalidatePath("/expediente");
  return { success: true };
}
