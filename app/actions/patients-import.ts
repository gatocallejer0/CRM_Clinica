"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { parseCsv } from "@/lib/csv";
import type { FormField } from "./form-fields";

// Mismo patrón que la validación de correo en register_patient() (ver
// 0004_dynamic_form.sql) — se mantiene igual para no aceptar en la carga
// masiva algo que el registro público rechazaría.
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isValidCalendarDate(y: number, m: number, d: number): boolean {
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

async function getActiveFields(): Promise<FormField[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("form_fields")
    .select(
      "id, section, key, label, field_type, required, active, sort_order, options:form_field_options(id, field_id, value, active, sort_order)",
    )
    .eq("active", true)
    .order("sort_order")
    .order("sort_order", { referencedTable: "form_field_options" });

  if (error) throw new Error(error.message);
  return (data ?? []) as FormField[];
}

export type ImportRowError = {
  row: number;
  field: string;
  message: string;
};

export type ImportPreviewRow = {
  row: number;
  email: string;
  answers: Record<string, string>;
};

export type ImportDuplicate = {
  row: number;
  email: string;
  reason: "repetido_en_archivo" | "ya_registrada";
};

export type ImportPreview = {
  totalDataRows: number;
  validRows: ImportPreviewRow[];
  errors: ImportRowError[];
  duplicates: ImportDuplicate[];
  unknownColumns: string[];
};

export type ImportPreviewResult = { error: string } | { preview: ImportPreview };

/**
 * Valida el CSV completo contra el catálogo ACTUAL de form_fields — nada se
 * guarda todavía. La base de datos no valida formato de fecha/número (solo
 * opciones de "select", ver register_patient() en 0004_dynamic_form.sql), así
 * que toda esa validación de tipo vive aquí; es la única red de seguridad
 * real para datos que vienen de un CSV en vez del formulario/selector nativo.
 */
export async function previewPatientsImport(formData: FormData): Promise<ImportPreviewResult> {
  await requireRole(["Admin"]);

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { error: "Selecciona un archivo CSV." };
  }
  if (file.size === 0) {
    return { error: "El archivo está vacío." };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "El archivo es demasiado grande (máximo 5 MB)." };
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return { error: "El archivo está vacío." };
  }

  const header = rows[0].map((h) => h.trim());
  const emailColIndex = header.findIndex((h) => h.toLowerCase() === "email");
  if (emailColIndex === -1) {
    return {
      error: 'El archivo no tiene una columna "email". Descarga la plantilla e inténtalo de nuevo.',
    };
  }

  const dataRows = rows.slice(1);
  const fields = await getActiveFields();
  const fieldByKey = new Map(fields.map((f) => [f.key, f]));

  const fieldColIndexByKey = new Map<string, number>();
  const unknownColumns: string[] = [];
  header.forEach((h, i) => {
    if (i === emailColIndex) return;
    if (fieldByKey.has(h)) {
      fieldColIndexByKey.set(h, i);
    } else if (h !== "") {
      unknownColumns.push(h);
    }
  });

  type ParsedRow = { row: number; email: string; answers: Record<string, string>; hasError: boolean };
  const parsedRows: ParsedRow[] = [];
  const errors: ImportRowError[] = [];
  const duplicates: ImportDuplicate[] = [];

  dataRows.forEach((cells, i) => {
    const rowNumber = i + 2; // la fila 1 es el encabezado
    if (cells.every((c) => c.trim() === "")) return; // fila en blanco: se ignora sin error

    const email = (cells[emailColIndex] ?? "").trim().toLowerCase();
    let hasError = false;

    if (!email) {
      errors.push({ row: rowNumber, field: "email", message: "El correo es obligatorio." });
      hasError = true;
    } else if (!EMAIL_RE.test(email)) {
      errors.push({ row: rowNumber, field: "email", message: `"${email}" no es un correo válido.` });
      hasError = true;
    }

    const answers: Record<string, string> = {};

    for (const field of fields) {
      const colIndex = fieldColIndexByKey.get(field.key);
      const raw = colIndex === undefined ? "" : (cells[colIndex] ?? "").trim();

      if (raw === "") {
        if (field.required) {
          errors.push({ row: rowNumber, field: field.label, message: "Este campo es obligatorio." });
          hasError = true;
        }
        continue;
      }

      if (field.field_type === "number" && !Number.isFinite(Number(raw))) {
        errors.push({ row: rowNumber, field: field.label, message: `"${raw}" no es un número válido.` });
        hasError = true;
        continue;
      }

      if (field.field_type === "date") {
        const match = DATE_RE.exec(raw);
        const [, y, m, d] = match ?? [];
        if (!match || !isValidCalendarDate(Number(y), Number(m), Number(d))) {
          errors.push({
            row: rowNumber,
            field: field.label,
            message: `"${raw}" no es una fecha válida. Usa el formato AAAA-MM-DD (ej. 1990-08-16).`,
          });
          hasError = true;
          continue;
        }
      }

      if (field.field_type === "select") {
        const validOptions = field.options.filter((o) => o.active).map((o) => o.value);
        if (!validOptions.includes(raw)) {
          errors.push({
            row: rowNumber,
            field: field.label,
            message: `"${raw}" no es una opción válida. Opciones: ${validOptions.join(", ")}.`,
          });
          hasError = true;
          continue;
        }
      }

      answers[field.key] = raw;
    }

    parsedRows.push({ row: rowNumber, email, answers, hasError });
  });

  // Duplicados dentro del mismo archivo.
  const seenEmails = new Set<string>();
  for (const r of parsedRows) {
    if (!r.email) continue;
    if (seenEmails.has(r.email)) {
      duplicates.push({ row: r.row, email: r.email, reason: "repetido_en_archivo" });
      r.hasError = true;
    } else {
      seenEmails.add(r.email);
    }
  }

  // Duplicados contra pacientes ya registradas — una sola consulta para todo el archivo.
  const candidateEmails = [...seenEmails];
  if (candidateEmails.length > 0) {
    const supabase = await createClient();
    const { data: existing, error: existingError } = await supabase
      .from("patients")
      .select("email")
      .in("email", candidateEmails);
    if (existingError) throw new Error(existingError.message);

    const existingEmails = new Set((existing ?? []).map((p) => p.email.toLowerCase()));
    for (const r of parsedRows) {
      if (r.email && existingEmails.has(r.email) && !duplicates.some((d) => d.row === r.row)) {
        duplicates.push({ row: r.row, email: r.email, reason: "ya_registrada" });
        r.hasError = true;
      }
    }
  }

  const validRows = parsedRows
    .filter((r) => !r.hasError)
    .map((r) => ({ row: r.row, email: r.email, answers: r.answers }));

  return {
    preview: {
      totalDataRows: parsedRows.length,
      validRows,
      errors,
      duplicates,
      unknownColumns,
    },
  };
}

export type ImportCommitResult = { error: string } | { imported: number; skipped: number };

/**
 * Inserta las filas ya validadas por previewPatientsImport. Vuelve a
 * comprobar correos duplicados contra la base al confirmar (pudo pasar
 * tiempo desde la vista previa, o alguien más registrar a la misma paciente
 * mientras tanto).
 */
export async function commitPatientsImport(rows: ImportPreviewRow[]): Promise<ImportCommitResult> {
  const profile = await requireRole(["Admin"]);

  if (rows.length === 0) {
    return { error: "No hay pacientes válidas para importar." };
  }

  const supabase = await createClient();

  const emails = rows.map((r) => r.email);
  const { data: existing, error: existingError } = await supabase
    .from("patients")
    .select("email")
    .in("email", emails);
  if (existingError) return { error: existingError.message };

  const existingEmails = new Set((existing ?? []).map((p) => p.email.toLowerCase()));
  const seen = new Set<string>();
  const toInsert = rows.filter((r) => {
    if (existingEmails.has(r.email) || seen.has(r.email)) return false;
    seen.add(r.email);
    return true;
  });
  const skipped = rows.length - toInsert.length;

  if (toInsert.length === 0) {
    return { imported: 0, skipped };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("patients")
    .insert(toInsert.map((r) => ({ email: r.email, registered_by: profile.id })))
    .select("id, email");
  if (insertError) return { error: insertError.message };

  const idByEmail = new Map((inserted ?? []).map((p) => [p.email.toLowerCase(), p.id]));

  const fields = await getActiveFields();
  const fieldIdByKey = new Map(fields.map((f) => [f.key, f.id]));

  const answerRows: { patient_id: string; field_id: string; value: string }[] = [];
  for (const r of toInsert) {
    const patientId = idByEmail.get(r.email);
    if (!patientId) continue;
    for (const [key, value] of Object.entries(r.answers)) {
      const fieldId = fieldIdByKey.get(key);
      if (!fieldId) continue; // el campo se inactivó entre la vista previa y la confirmación
      answerRows.push({ patient_id: patientId, field_id: fieldId, value });
    }
  }

  if (answerRows.length > 0) {
    const { error: answersError } = await supabase.from("patient_answers").insert(answerRows);
    if (answersError) return { error: answersError.message };
  }

  revalidatePath("/expediente");
  revalidatePath("/");
  revalidatePath("/reportes");

  return { imported: toInsert.length, skipped };
}
