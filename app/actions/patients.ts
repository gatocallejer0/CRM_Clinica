"use server";

import * as z from "zod";
import { createClient } from "@/lib/supabase/server";

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
    return {
      error: "No se pudo completar el registro. Verifica los datos e intenta de nuevo.",
    };
  }

  return { success: true };
}
