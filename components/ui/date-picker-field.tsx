"use client";

import { useState } from "react";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

function dateToKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateKey(key: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

const DATE_LABEL_FORMAT = new Intl.DateTimeFormat("es-GT", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * Selector de fecha con el mismo Popover + Calendar del campo "Fecha" de
 * Nueva cita, para formularios reales (no para filtros — esos se quedan con
 * DateRangeFilter). captionLayout="dropdown" porque, a diferencia de una
 * cita, estas fechas (nacimiento, FUM, ultrasonido) suelen estar años atrás.
 */
export function DatePickerField({
  id,
  name,
  defaultValue,
  required,
  disabled,
  placeholder = "Selecciona una fecha",
}: {
  id?: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [date, setDate] = useState<Date | undefined>(
    defaultValue ? parseDateKey(defaultValue) : undefined,
  );
  const [open, setOpen] = useState(false);

  return (
    <>
      <input
        type="hidden"
        name={name}
        value={date ? dateToKey(date) : ""}
        required={required && !disabled}
        disabled={disabled}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          type="button"
          disabled={disabled}
          className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-white/35 px-3.5 text-sm shadow-xs transition-[color,box-shadow,border-color,background-color] duration-150 ease-out outline-none hover:border-ring/40 focus-visible:border-ring focus-visible:bg-white/65 focus-visible:ring-4 focus-visible:ring-ring/15 aria-expanded:border-ring aria-expanded:ring-4 aria-expanded:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
          {date ? (
            <span className="capitalize">{DATE_LABEL_FORMAT.format(date)}</span>
          ) : (
            <span className="text-muted-foreground/70">{placeholder}</span>
          )}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={date}
            onSelect={(d) => {
              setDate(d);
              setOpen(false);
            }}
            locale={es}
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </>
  );
}
