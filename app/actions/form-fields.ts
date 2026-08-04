"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

const SECTIONS = ["general", "medical_history"] as const;
const FIELD_TYPES = ["text", "textarea", "number", "date", "select"] as const;

export type FormFieldSection = (typeof SECTIONS)[number];
export type FormFieldType = (typeof FIELD_TYPES)[number];

export type FormFieldOption = {
  id: string;
  field_id: string;
  value: string;
  active: boolean;
  sort_order: number;
};

export type FormField = {
  id: string;
  section: FormFieldSection;
  key: string;
  label: string;
  field_type: FormFieldType;
  required: boolean;
  active: boolean;
  sort_order: number;
  options: FormFieldOption[];
};

function revalidateFormPaths() {
  revalidatePath("/admin/formulario");
  revalidatePath("/registro-paciente");
}

/**
 * Catálogo de preguntas + opciones del formulario de pacientes. Sin
 * requireRole a propósito: RLS filtra el resultado según quién llama —
 * `anon` (formulario público) solo ve preguntas/opciones activas, el
 * personal autenticado ve el catálogo completo (ver 0004_dynamic_form.sql).
 */
export async function getFormFieldsWithOptions(): Promise<FormField[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("form_fields")
    .select(
      "id, section, key, label, field_type, required, active, sort_order, options:form_field_options(id, field_id, value, active, sort_order)",
    )
    .order("sort_order")
    .order("sort_order", { referencedTable: "form_field_options" });

  if (error) throw new Error(error.message);
  return (data ?? []) as FormField[];
}

const CreateFormFieldSchema = z.object({
  section: z.enum(SECTIONS),
  key: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9_]+$/, { error: "Nombre de pregunta inválido." }),
  label: z.string().trim().min(2, { error: "La pregunta es muy corta." }),
  fieldType: z.enum(FIELD_TYPES),
  required: z.boolean().optional(),
});

export async function createFormField(input: {
  section: string;
  key: string;
  label: string;
  fieldType: string;
  required: boolean;
}): Promise<{ error?: string; field?: FormField }> {
  await requireRole(["Admin"]);

  const parsed = CreateFormFieldSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Revisa los datos de la pregunta." };
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("form_fields")
    .select("sort_order")
    .eq("section", parsed.data.section)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("form_fields")
    .insert({
      section: parsed.data.section,
      key: parsed.data.key,
      label: parsed.data.label,
      field_type: parsed.data.fieldType,
      required: parsed.data.required ?? false,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id, section, key, label, field_type, required, active, sort_order")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe una pregunta con ese nombre." };
    }
    return { error: error.message };
  }

  revalidateFormPaths();
  return { field: { ...(data as Omit<FormField, "options">), options: [] } };
}

export async function updateFormField(
  id: string,
  patch: Partial<{
    label: string;
    required: boolean;
    active: boolean;
    sortOrder: number;
  }>,
): Promise<{ error?: string }> {
  await requireRole(["Admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("form_fields")
    .update({
      ...(patch.label !== undefined && { label: patch.label }),
      ...(patch.required !== undefined && { required: patch.required }),
      ...(patch.active !== undefined && { active: patch.active }),
      ...(patch.sortOrder !== undefined && { sort_order: patch.sortOrder }),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateFormPaths();
  return {};
}

export async function deleteFormField(id: string): Promise<{ error?: string }> {
  await requireRole(["Admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("form_fields").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        error:
          "Esta pregunta ya tiene respuestas de pacientes; no se puede eliminar. Puedes inactivarla en su lugar.",
      };
    }
    return { error: error.message };
  }

  revalidateFormPaths();
  return {};
}

const CreateOptionSchema = z.object({
  fieldId: z.string().uuid(),
  value: z.string().trim().min(1, { error: "La opción no puede estar vacía." }).max(120),
});

export async function createFormFieldOption(input: {
  fieldId: string;
  value: string;
}): Promise<{ error?: string; option?: FormFieldOption }> {
  await requireRole(["Admin"]);

  const parsed = CreateOptionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Revisa el valor de la opción." };
  }

  const supabase = await createClient();
  const { data: last } = await supabase
    .from("form_field_options")
    .select("sort_order")
    .eq("field_id", parsed.data.fieldId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("form_field_options")
    .insert({
      field_id: parsed.data.fieldId,
      value: parsed.data.value,
      sort_order: (last?.sort_order ?? 0) + 1,
    })
    .select("id, field_id, value, active, sort_order")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Esa opción ya existe para esta pregunta." };
    }
    return { error: error.message };
  }

  revalidateFormPaths();
  return { option: data as FormFieldOption };
}

export async function updateFormFieldOption(
  id: string,
  patch: Partial<{ value: string; active: boolean; sortOrder: number }>,
): Promise<{ error?: string }> {
  await requireRole(["Admin"]);
  const supabase = await createClient();

  const { error } = await supabase
    .from("form_field_options")
    .update({
      ...(patch.value !== undefined && { value: patch.value }),
      ...(patch.active !== undefined && { active: patch.active }),
      ...(patch.sortOrder !== undefined && { sort_order: patch.sortOrder }),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidateFormPaths();
  return {};
}

export async function deleteFormFieldOption(id: string): Promise<{ error?: string }> {
  await requireRole(["Admin"]);
  const supabase = await createClient();

  const { error } = await supabase.from("form_field_options").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidateFormPaths();
  return {};
}
