"use client";

import { useState } from "react";
import { HistoryIcon } from "lucide-react";
import { getRecordAuditLog } from "@/app/actions/audit";
import type { AuditLogEntry } from "@/lib/audit";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ACTION_LABELS: Record<AuditLogEntry["action"], string> = {
  create: "Creación",
  update: "Cambio",
  delete: "Eliminación",
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-GT", {
  dateStyle: "medium",
  timeStyle: "short",
});

/** Botón "Ver historial" reusable: abre un diálogo con la bitácora de auditoría de una fila. */
export function AuditLogDialog({
  tableName,
  recordId,
  title,
}: {
  tableName: string;
  recordId: string;
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setLoading(true);
    getRecordAuditLog(tableName, recordId)
      .then(setEntries)
      .finally(() => setLoading(false));
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        title="Ver historial"
        onClick={() => handleOpenChange(true)}
      >
        <HistoryIcon className="size-4" />
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Historial</DialogTitle>
            <DialogDescription>{title}</DialogDescription>
          </DialogHeader>

          <div className="flex max-h-96 flex-col gap-2.5 overflow-y-auto">
            {loading && <p className="py-4 text-center text-sm text-muted-foreground">Cargando...</p>}
            {!loading && entries.length === 0 && (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Sin cambios registrados todavía.
              </p>
            )}
            {!loading &&
              entries.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border bg-white/35 px-3.5 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-primary">
                      {ACTION_LABELS[entry.action]}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {DATE_TIME_FORMAT.format(new Date(entry.created_at))}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{entry.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Por {entry.performed_by_name}</p>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
