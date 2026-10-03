import { TriangleAlertIcon } from "lucide-react";

/**
 * Aviso interno para quien administra el sitio, no para la paciente: marca
 * qué datos de identidad/contacto de la clínica todavía son placeholders en
 * esta página legal. Se agregó al redactar la Política de Privacidad y los
 * Términos antes de tener el nombre legal, correo y dirección reales de la
 * clínica — quitar este componente de la página en cuanto se reemplacen
 * todos los [placeholders] por los datos definitivos.
 */
export function PendingDetailBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" strokeWidth={2} />
      <p>
        <strong className="font-semibold">Borrador pendiente de completar.</strong> Los textos resaltados como{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[0.85em]">[entre corchetes]</code> son
        marcadores de posición (nombre legal, contacto, dirección) — hay que reemplazarlos por los datos reales
        de la clínica antes de publicar esta página.
      </p>
    </div>
  );
}
