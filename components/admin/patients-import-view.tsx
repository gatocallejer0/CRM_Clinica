"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { toast } from "sonner";
import { DownloadIcon, TriangleAlertIcon, UploadIcon } from "lucide-react";
import {
  previewPatientsImport,
  commitPatientsImport,
  type ImportPreview,
  type ImportPreviewRow,
} from "@/app/actions/patients-import";
import type { FormField, FormFieldType } from "@/app/actions/form-fields";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BackToAdminLink } from "./back-to-admin-link";

const FIELD_TYPE_LABELS: Record<FormFieldType, string> = {
  text: "Texto corto",
  textarea: "Texto largo",
  number: "Número",
  date: "Fecha (AAAA-MM-DD)",
  select: "Selección de lista",
};

function FieldsReference({ fields }: { fields: FormField[] }) {
  return (
    <Card className="gap-0 p-0">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="pl-5">Columna</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Obligatoria</TableHead>
            <TableHead className="pr-5">Valores válidos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell className="pl-5 font-medium text-foreground">email</TableCell>
            <TableCell>Correo</TableCell>
            <TableCell>
              <Badge variant="secondary">Sí</Badge>
            </TableCell>
            <TableCell className="pr-5 text-muted-foreground">Un correo válido, ej. ana@correo.com</TableCell>
          </TableRow>
          {fields.map((field) => (
            <TableRow key={field.id}>
              <TableCell className="pl-5 font-medium text-foreground">{field.key}</TableCell>
              <TableCell>{FIELD_TYPE_LABELS[field.field_type]}</TableCell>
              <TableCell>
                {field.required ? (
                  <Badge variant="secondary">Sí</Badge>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )}
              </TableCell>
              <TableCell className="pr-5 text-muted-foreground">
                {field.field_type === "select"
                  ? field.options
                      .filter((o) => o.active)
                      .map((o) => o.value)
                      .join(", ")
                  : field.field_type === "date"
                    ? "Ej. 1990-08-16"
                    : "Texto libre"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function ImportReport({
  preview,
  onConfirm,
  onDiscard,
  importing,
}: {
  preview: ImportPreview;
  onConfirm: () => void;
  onDiscard: () => void;
  importing: boolean;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground">Resultado de la validación</h2>
          <p className="text-sm text-muted-foreground">
            {preview.totalDataRows} filas leídas — {preview.validRows.length} listas para importar.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDiscard} disabled={importing}>
            Cancelar
          </Button>
          <Button onClick={onConfirm} disabled={preview.validRows.length === 0 || importing} loading={importing}>
            {importing ? "Importando..." : `Importar ${preview.validRows.length} pacientes`}
          </Button>
        </div>
      </div>

      {preview.unknownColumns.length > 0 && (
        <Alert className="mb-3">
          <TriangleAlertIcon />
          <AlertTitle>Columnas no reconocidas (se ignoraron)</AlertTitle>
          <AlertDescription>{preview.unknownColumns.join(", ")}</AlertDescription>
        </Alert>
      )}

      {preview.duplicates.length > 0 && (
        <Alert className="mb-3">
          <TriangleAlertIcon />
          <AlertTitle>{preview.duplicates.length} fila(s) omitidas por correo duplicado</AlertTitle>
          <AlertDescription>
            <ul className="flex flex-col gap-0.5">
              {preview.duplicates.map((d) => (
                <li key={`${d.row}-${d.email}`}>
                  Fila {d.row} — {d.email}:{" "}
                  {d.reason === "ya_registrada" ? "ya existe en el sistema." : "repetido en el archivo."}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {preview.errors.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>{preview.errors.length} error(es) — esas filas no se importarán</AlertTitle>
          <AlertDescription>
            <ul className="flex flex-col gap-0.5">
              {preview.errors.map((e, i) => (
                <li key={i}>
                  Fila {e.row} — {e.field}: {e.message}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {preview.errors.length === 0 && preview.duplicates.length === 0 && preview.unknownColumns.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin problemas — todas las filas están listas para importar.</p>
      )}
    </Card>
  );
}

export function PatientsImportView({ fields }: { fields: FormField[] }) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [validatingError, setValidatingError] = useState<string | undefined>();
  const [validating, startValidating] = useTransition();
  const [importing, startImporting] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreview(null);
    setValidatingError(undefined);
    const formData = new FormData();
    formData.set("file", file);

    startValidating(async () => {
      const result = await previewPatientsImport(formData);
      if ("error" in result) {
        setValidatingError(result.error);
        return;
      }
      setPreview(result.preview);
    });
  }

  function reset() {
    setPreview(null);
    setValidatingError(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleConfirm(rows: ImportPreviewRow[]) {
    startImporting(async () => {
      const result = await commitPatientsImport(rows);
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      if (result.skipped > 0) {
        toast.success(
          `Se importaron ${result.imported} pacientes (${result.skipped} se omitieron por correo duplicado).`,
        );
      } else {
        toast.success(`Se importaron ${result.imported} pacientes.`);
      }
      reset();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <BackToAdminLink />

      <div className="flex justify-end">
        <a href="/admin/pacientes/plantilla" className={buttonVariants({ variant: "outline" })}>
          <DownloadIcon />
          Descargar plantilla
        </a>
      </div>

      <div>
        <h2 className="mb-2 font-heading text-sm font-semibold text-foreground">Columnas del formulario actual</h2>
        <FieldsReference fields={fields} />
      </div>

      <Card className="p-6">
        <CardHeader className="mb-3 p-0">
          <CardTitle>Subir archivo</CardTitle>
          <CardDescription>Se valida todo el archivo antes de crear nada.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 p-0">
          <label
            className={buttonVariants({
              variant: "outline",
              className: "w-fit cursor-pointer",
            })}
          >
            <UploadIcon />
            {validating ? "Validando..." : "Elegir archivo CSV"}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={validating}
              onChange={handleFileChange}
            />
          </label>

          {validatingError && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{validatingError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {preview && (
        <ImportReport
          preview={preview}
          importing={importing}
          onDiscard={reset}
          onConfirm={() => handleConfirm(preview.validRows)}
        />
      )}
    </div>
  );
}
