import { TriangleAlertIcon } from "lucide-react";
import type { OverlapConflict } from "@/app/actions/appointments";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

/**
 * Aviso de traslape de horario, compartido entre el formulario de
 * cita (`AppointmentDialog`) y el drag-and-drop del calendario
 * (`FullCalendarView`) — misma decisión de negocio, misma UI en ambos
 * lugares. Usa los tokens `--status-waiting-*` (el mismo tono que el badge
 * "En espera") en vez de colores de Tailwind sueltos, para que se adapte
 * igual que el resto de la app si algún día se activa el modo oscuro.
 */
export function OverlapWarning({
  overlap,
  onDismiss,
  onConfirm,
  dismissLabel = "Elegir otro horario",
  confirmLabel = "Confirmar de todas formas",
}: {
  overlap: OverlapConflict[];
  onDismiss: () => void;
  onConfirm: () => void;
  dismissLabel?: string;
  confirmLabel?: string;
}) {
  return (
    <Alert
      style={{
        borderColor: "color-mix(in oklab, var(--status-waiting-fg) 35%, transparent)",
        backgroundColor: "var(--status-waiting-bg)",
        color: "var(--status-waiting-fg)",
      }}
    >
      <TriangleAlertIcon style={{ color: "var(--status-waiting-fg)" }} />
      <AlertDescription style={{ color: "color-mix(in oklab, var(--status-waiting-fg) 90%, transparent)" }}>
        <p className="font-medium" style={{ color: "var(--status-waiting-fg)" }}>
          Ya hay una cita en ese horario:
        </p>
        <ul className="mt-1 list-disc pl-4">
          {overlap.map((c, i) => (
            <li key={i}>
              {c.timeLabel} — {c.patientName}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onDismiss}>
            {dismissLabel}
          </Button>
          <Button type="button" size="sm" onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
