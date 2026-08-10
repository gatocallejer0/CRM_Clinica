"use client";

import {
  TimeField as AriaTimeField,
  DateInput,
  DateSegment,
  type TimeValue,
} from "react-aria-components";
import { ClockIcon } from "lucide-react";

// Input de hora segmentado (hora / minuto / a. m.-p. m., cada uno editable
// por separado con teclado o flechas) en vez de una lista desplegable de
// franjas fijas — se siente más "campo nativo" y permite cualquier minuto,
// no solo múltiplos de 15.
export function TimeField({
  value,
  onChange,
  id,
  className,
  "aria-label": ariaLabel,
}: {
  value: TimeValue | null;
  onChange: (value: TimeValue | null) => void;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <AriaTimeField
      id={id}
      value={value}
      // React 19 dispara un reset nativo del <form> tras cada envío de una
      // Server Action — incluso cuando el envío "falla" (p. ej. una alerta
      // de traslape que solo pausa para confirmar). react-aria escucha ese
      // evento y revierte a defaultValue, no a un string vacío; si no lo
      // mantenemos igual a value, cada envío borra la hora ya escrita justo
      // cuando más se necesita conservarla (para reintentar o confirmar).
      defaultValue={value ?? undefined}
      onChange={onChange}
      hourCycle={12}
      granularity="minute"
      aria-label={ariaLabel}
      className={className}
    >
      <div className="flex h-10 w-full items-center gap-1.5 rounded-lg border border-input bg-white/35 px-3.5 text-sm shadow-xs outline-none transition-[color,box-shadow,border-color,background-color] duration-150 ease-out hover:border-ring/40 focus-within:border-ring focus-within:bg-white/65 focus-within:ring-4 focus-within:ring-ring/15">
        <DateInput className="flex flex-1 items-center outline-none">
          {(segment) => (
            <DateSegment
              segment={segment}
              className="rounded px-0.5 py-0.5 text-right tabular-nums caret-transparent outline-none data-[placeholder]:text-muted-foreground/70 data-[focused]:bg-primary/15 data-[focused]:text-primary data-[type=literal]:px-0 data-[type=literal]:text-muted-foreground"
            />
          )}
        </DateInput>
        <ClockIcon className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </AriaTimeField>
  );
}
