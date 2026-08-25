// Compartido entre el server action (app/actions/clinical-documents.ts) y el
// componente cliente (components/expediente/clinical-documents.tsx) — un
// archivo "use server" solo puede exportar funciones async, así que estas
// constantes viven en un módulo aparte que ambos pueden importar.
export const MAX_DOCUMENT_SIZE_BYTES = 20 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "application/pdf",
]);
