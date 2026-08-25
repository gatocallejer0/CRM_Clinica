"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/clinical-document-limits";

const CLINICAL_ROLES = ["Admin", "Doctor"];
const BUCKET = "clinical-documents";

export type ClinicalDocument = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  description: string | null;
  createdAt: string;
  uploadedByName: string | null;
  /** URL firmada de corta duración; null si no se pudo generar (no bloquea la lista). */
  url: string | null;
};

type DocumentRow = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  description: string | null;
  created_at: string;
  uploaded_by: { full_name: string } | null;
};

/**
 * Documentos de una paciente, con una URL firmada por archivo (el bucket es
 * privado a propósito — nunca una URL pública permanente para un documento
 * clínico). La URL dura 1 hora, suficiente para ver/descargar durante la
 * sesión; se regenera cada vez que se vuelve a cargar el expediente.
 */
export async function listPatientDocuments(patientId: string): Promise<ClinicalDocument[]> {
  await requireRole(CLINICAL_ROLES);
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("clinical_documents")
    .select(
      "id, storage_path, file_name, mime_type, size_bytes, description, created_at, uploaded_by:profiles(full_name)",
    )
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .returns<DocumentRow[]>();

  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return [];

  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      rows.map((r) => r.storage_path),
      3600,
    );
  const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));

  return rows.map((r) => ({
    id: r.id,
    fileName: r.file_name,
    mimeType: r.mime_type,
    sizeBytes: r.size_bytes,
    description: r.description,
    createdAt: r.created_at,
    uploadedByName: r.uploaded_by?.full_name ?? null,
    url: urlByPath.get(r.storage_path) ?? null,
  }));
}

export type UploadDocumentState = { error?: string; success?: boolean } | undefined;

export async function uploadClinicalDocument(
  _prevState: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  const profile = await requireRole(CLINICAL_ROLES);

  const patientId = formData.get("patientId");
  const file = formData.get("file");
  const description = formData.get("description");

  if (typeof patientId !== "string" || !patientId) {
    return { error: "Paciente inválida." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecciona un archivo." };
  }
  if (!ALLOWED_DOCUMENT_MIME_TYPES.has(file.type)) {
    return { error: "Solo se permiten imágenes (JPG, PNG, WEBP, HEIC) o PDF." };
  }
  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return { error: "El archivo es demasiado grande (máximo 20 MB)." };
  }

  const supabase = await createClient();
  const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : "";
  const storagePath = `${patientId}/${crypto.randomUUID()}${ext}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type,
  });
  if (uploadError) {
    console.error("[uploadClinicalDocument] Storage error:", uploadError.message);
    return { error: "No se pudo subir el archivo." };
  }

  const { error: insertError } = await supabase.from("clinical_documents").insert({
    patient_id: patientId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    size_bytes: file.size,
    description: typeof description === "string" && description.trim() ? description.trim() : null,
    uploaded_by: profile.id,
  });
  if (insertError) {
    // Sin esto, un insert fallido deja un archivo huérfano en el bucket que
    // nadie referencia ni puede limpiar desde la UI.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    console.error("[uploadClinicalDocument] Insert error:", insertError.message);
    return { error: "No se pudo guardar el documento." };
  }

  revalidatePath("/expediente");
  return { success: true };
}

export async function deleteClinicalDocument(documentId: string): Promise<{ error?: string }> {
  await requireRole(CLINICAL_ROLES);
  const supabase = await createClient();

  const { data: doc, error: fetchError } = await supabase
    .from("clinical_documents")
    .select("storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };
  if (!doc) return { error: "El documento ya no existe." };

  const { error: deleteError } = await supabase.from("clinical_documents").delete().eq("id", documentId);
  if (deleteError) {
    console.error("[deleteClinicalDocument] Delete error:", deleteError.message);
    return { error: "No se pudo eliminar el documento." };
  }

  // Se borra el archivo después de confirmar el delete de la fila: así nunca
  // queda una fila apuntando a un archivo que ya no existe.
  await supabase.storage.from(BUCKET).remove([doc.storage_path]);

  revalidatePath("/expediente");
  return {};
}
