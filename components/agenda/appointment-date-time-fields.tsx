"use client";

import { useState } from "react";
import { es } from "date-fns/locale";
import { Time } from "@internationalized/date";
import { CalendarIcon } from "lucide-react";
import type { TimeValue } from "react-aria-components";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { TimeField } from "@/components/ui/time-field";
import { Field, FieldRow } from "@/components/ui/field";

/** Lee/escribe año-mes-día en componentes locales, sin pasar por husos horarios. */
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

function parseTimeKey(key: string): Time | null {
  const match = /^(\d{2}):(\d{2})$/.exec(key);
  if (!match) return null;
  return new Time(Number(match[1]), Number(match[2]));
}

function timeToKey(value: TimeValue | null): string {
  if (!value) return "";
  return `${String(value.hour).padStart(2, "0")}:${String(value.minute).padStart(2, "0")}`;
}

const DATE_LABEL_FORMAT = new Intl.DateTimeFormat("es-GT", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

export function AppointmentDateTimeFields({
  defaultDate,
  defaultTime,
}: {
  defaultDate?: string;
  defaultTime?: string;
}) {
  const [date, setDate] = useState<Date | undefined>(
    defaultDate ? parseDateKey(defaultDate) : undefined,
  );
  const [time, setTime] = useState<TimeValue | null>(
    defaultTime ? parseTimeKey(defaultTime) : null,
  );
  const [dateOpen, setDateOpen] = useState(false);

  return (
    <FieldRow>
      <Field label="Fecha" htmlFor="date-trigger" required>
        <input type="hidden" name="date" value={date ? dateToKey(date) : ""} required />
        <Popover open={dateOpen} onOpenChange={setDateOpen}>
          <PopoverTrigger
            id="date-trigger"
            className="flex h-10 w-full items-center gap-2 rounded-lg border border-input bg-white/35 px-3.5 text-sm shadow-xs transition-[color,box-shadow,border-color,background-color] duration-150 ease-out outline-none hover:border-ring/40 focus-visible:border-ring focus-visible:bg-white/65 focus-visible:ring-4 focus-visible:ring-ring/15 aria-expanded:border-ring aria-expanded:ring-4 aria-expanded:ring-ring/15"
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
            {date ? (
              <span className="capitalize">{DATE_LABEL_FORMAT.format(date)}</span>
            ) : (
              <span className="text-muted-foreground/70">Selecciona una fecha</span>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setDateOpen(false);
              }}
              locale={es}
              autoFocus
            />
          </PopoverContent>
        </Popover>
      </Field>

      <Field label="Hora" htmlFor="time-input" required>
        <input type="hidden" name="time" value={timeToKey(time)} required />
        <TimeField id="time-input" value={time} onChange={setTime} aria-label="Hora" />
      </Field>
    </FieldRow>
  );
}
