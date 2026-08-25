"use client";

import { useActionState, useEffect, useRef, useState, useTransition, type ChangeEvent } from "react";
import { FileTextIcon, Trash2Icon, UploadIcon } from "lucide-react";
import {
  uploadClinicalDocument,
  deleteClinicalDocument,
  listPatientDocuments,
  type ClinicalDocument,
} from "@/app/actions/clinical-documents";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
import { formatFileSize } from "@/lib/format";
import { ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_SIZE_BYTES } from "@/lib/clinical-document-limits";

const ACCEPTED_TYPES = [...ALLOWED_DOCUMENT_MIME_TYPES].join(",");

// created_at es un timestamptz completo (con hora), a diferencia de los
// campos tipo "date" que usa formatDateEs en clinical-utils.ts — necesita su
// propio formateador en vez de reusar ese (que espera solo fecha, sin hora).
const DOCUMENT_DATE_FORMAT = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });

function DocumentRow({
  document,
  onDeleted,
}: {
  document: ClinicalDocument;
  onDeleted: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();
  const isImage = document.mimeType.startsWith("image/");

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteClinicalDocument(document.id);
      if (result.error) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      onDeleted(document.id);
    });
  }

  return (
    <div className="flex items-center gap-3 py-2.5">
      <a
        href={document.url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted"
      >
        {isImage && document.url ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal, no un asset estático
          <img src={document.url} alt="" className="size-full object-cover" />
        ) : (
          <FileTextIcon className="size-5 text-muted-foreground" />
        )}
      </a>

      <div className="min-w-0 flex-1">
        <a
          href={document.url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-foreground hover:underline"
        >
          {document.description || document.fileName}
        </a>
        <p className="truncate text-xs text-muted-foreground">
          {DOCUMENT_DATE_FORMAT.format(new Date(document.createdAt))}
          {document.uploadedByName ? ` · ${document.uploadedByName}` : ""} · {formatFileSize(document.sizeBytes)}
        </p>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      {confirming ? (
        <div className="flex shrink-0 gap-2">
          <Button type="button" variant="destructive" size="xs" disabled={pending} onClick={handleDelete}>
            Confirmar
          </Button>
          <Button type="button" variant="ghost" size="xs" onClick={() => setConfirming(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="shrink-0"
          onClick={() => setConfirming(true)}
          aria-label="Eliminar documento"
        >
          <Trash2Icon />
        </Button>
      )}
    </div>
  );
}

export function ClinicalDocuments({
  patientId,
  initialDocuments,
}: {
  patientId: string;
  initialDocuments: ClinicalDocument[];
}) {
  const [documents, setDocuments] = useState(initialDocuments);
  const [state, action, pending] = useActionState(uploadClinicalDocument, undefined);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | undefined>();
  const formRef = useRef<HTMLFormElement>(null);
  const [refreshing, startRefreshing] = useTransition();

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      startRefreshing(async () => {
        const fresh = await listPatientDocuments(patientId);
        setDocuments(fresh);
        setSelectedFileName(null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleDeleted(id: string) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFileName(null);
      setClientError(undefined);
      return;
    }

    // Se valida el tamaño ANTES de enviar el formulario: si el archivo pasa
    // el límite del cuerpo de la Server Action (next.config.ts), Next.js
    // corta el cuerpo a medias y el error que se ve es un críptico
    // "Unexpected end of form" en vez de un mensaje claro — mejor no dejar
    // que ese archivo se envíe siquiera.
    if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
      setClientError(
        `"${file.name}" pesa ${formatFileSize(file.size)} — el máximo es ${formatFileSize(MAX_DOCUMENT_SIZE_BYTES)}.`,
      );
      setSelectedFileName(null);
      e.target.value = "";
      return;
    }

    setClientError(undefined);
    setSelectedFileName(file.name);
  }

  return (
    <div className="flex flex-col gap-4">
      <form ref={formRef} action={action} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="patientId" value={patientId} />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-foreground" htmlFor="doc-description">
            Descripción (opcional)
          </label>
          <Input
            id="doc-description"
            name="description"
            placeholder="Ej. Ultrasonido 20 semanas"
            className="w-56"
          />
        </div>

        <label className={buttonVariants({ variant: "outline", className: "cursor-pointer" })}>
          <UploadIcon />
          {selectedFileName ?? "Elegir archivo"}
          <input
            type="file"
            name="file"
            accept={ACCEPTED_TYPES}
            className="sr-only"
            required
            onChange={handleFileChange}
          />
        </label>

        <Button type="submit" disabled={pending || !!clientError} loading={pending}>
          {pending ? "Subiendo..." : "Subir documento"}
        </Button>

        <p className="w-full text-xs text-muted-foreground">
          Imágenes (JPG, PNG, WEBP, HEIC) o PDF — máx. {formatFileSize(MAX_DOCUMENT_SIZE_BYTES)}.
        </p>
      </form>

      {(clientError || state?.error) && (
        <Alert variant="destructive">
          <AlertDescription>{clientError ?? state?.error}</AlertDescription>
        </Alert>
      )}

      {documents.length === 0 ? (
        <EmptyState icon={FileTextIcon} message="Sin documentos todavía." className="py-6" />
      ) : (
        <div className={`flex flex-col divide-y divide-border ${refreshing ? "opacity-60" : ""}`}>
          {documents.map((doc) => (
            <DocumentRow key={doc.id} document={doc} onDeleted={handleDeleted} />
          ))}
        </div>
      )}
    </div>
  );
}
