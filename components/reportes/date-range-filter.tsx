"use client";

import { useState } from "react";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";

const RANGE_LABEL_FORMAT = new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short" });

export function DateRangeFilter({
  value,
  onValueChange,
}: {
  value: DateRange | undefined;
  onValueChange: (value: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  const label = value?.from
    ? value.to && value.to.getTime() !== value.from.getTime()
      ? `${RANGE_LABEL_FORMAT.format(value.from)} – ${RANGE_LABEL_FORMAT.format(value.to)}`
      : RANGE_LABEL_FORMAT.format(value.from)
    : "Todo el tiempo";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-10 items-center gap-2 rounded-lg border border-input bg-white/35 px-3.5 text-sm shadow-xs transition-[color,box-shadow,border-color,background-color] duration-150 ease-out outline-none hover:border-ring/40 focus-visible:border-ring focus-visible:bg-white/65 focus-visible:ring-4 focus-visible:ring-ring/15 aria-expanded:border-ring aria-expanded:ring-4 aria-expanded:ring-ring/15">
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="capitalize">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar mode="range" selected={value} onSelect={onValueChange} locale={es} numberOfMonths={2} autoFocus />
        {value?.from && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onValueChange(undefined);
                setOpen(false);
              }}
            >
              Limpiar (todo el tiempo)
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
