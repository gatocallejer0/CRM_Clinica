"use client";

import { useState, useTransition, useEffect } from "react";
import {
  listAppointments,
  type Appointment,
  type Service,
  type DoctorOption,
} from "@/app/actions/appointments";
import {
  clinicToday,
  addDays,
  addMonths,
  startOfWeek,
  startOfMonth,
  toClinicDateKey,
  formatClinicDateLong,
  formatClinicMonthLabel,
} from "@/lib/clinic-time";
import { Button } from "@/components/ui/button";
import { AgendaDayView } from "./agenda-day-view";
import { AgendaWeekView } from "./agenda-week-view";
import { AgendaMonthView } from "./agenda-month-view";
import { NewAppointmentDialog } from "./new-appointment-dialog";
import { DayDetailDialog } from "./day-detail-dialog";

type ViewMode = "day" | "week" | "month";

const VIEW_TABS: { value: ViewMode; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

function rangeFor(view: ViewMode, anchor: Date): { from: Date; to: Date } {
  if (view === "day") return { from: anchor, to: addDays(anchor, 1) };
  if (view === "week") {
    const from = startOfWeek(anchor);
    return { from, to: addDays(from, 7) };
  }
  const from = startOfWeek(startOfMonth(anchor));
  return { from, to: addDays(from, 42) };
}

export function AgendaView({
  initialAppointments,
  services,
  doctors,
}: {
  initialAppointments: Appointment[];
  services: Service[];
  doctors: DoctorOption[];
}) {
  const [view, setView] = useState<ViewMode>("day");
  const [anchor, setAnchor] = useState<Date>(() => clinicToday());
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [pending, startTransition] = useTransition();
  const [newApptOpen, setNewApptOpen] = useState(false);
  const [dayDetail, setDayDetail] = useState<{ dateKey: string; appointments: Appointment[] } | null>(
    null,
  );

  useEffect(() => {
    const { from, to } = rangeFor(view, anchor);
    startTransition(async () => {
      const data = await listAppointments(from.toISOString(), to.toISOString());
      setAppointments(data);
    });
  }, [view, anchor]);

  function reload() {
    const { from, to } = rangeFor(view, anchor);
    startTransition(async () => {
      const data = await listAppointments(from.toISOString(), to.toISOString());
      setAppointments(data);
    });
  }

  function goPrev() {
    setAnchor((prev) =>
      view === "day" ? addDays(prev, -1) : view === "week" ? addDays(prev, -7) : addMonths(prev, -1),
    );
  }

  function goNext() {
    setAnchor((prev) =>
      view === "day" ? addDays(prev, 1) : view === "week" ? addDays(prev, 7) : addMonths(prev, 1),
    );
  }

  const periodLabel =
    view === "day"
      ? formatClinicDateLong(anchor)
      : view === "week"
        ? `Semana del ${formatClinicDateLong(startOfWeek(anchor))}`
        : formatClinicMonthLabel(anchor);

  const dayAppointments = appointments.filter(
    (a) => toClinicDateKey(new Date(a.scheduled_at)) === toClinicDateKey(anchor),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/70 bg-white/50 p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setView(tab.value)}
              className={`rounded-xl px-4.5 py-2 text-sm font-semibold transition-colors ${
                view === tab.value
                  ? "bg-[image:var(--gradient-primary)] text-white"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={goPrev}
            className="flex size-8 items-center justify-center rounded-[10px] border border-white/80 bg-white/60 font-bold text-primary hover:bg-white/80"
          >
            ‹
          </button>
          <div className="min-w-[180px] text-center font-heading text-[15px] font-semibold text-foreground">
            {periodLabel}
          </div>
          <button
            type="button"
            onClick={goNext}
            className="flex size-8 items-center justify-center rounded-[10px] border border-white/80 bg-white/60 font-bold text-primary hover:bg-white/80"
          >
            ›
          </button>
        </div>

        <Button onClick={() => setNewApptOpen(true)}>+ Nueva cita</Button>
      </div>

      {pending && <p className="text-xs text-muted-foreground">Actualizando...</p>}

      {view === "day" && <AgendaDayView appointments={dayAppointments} />}
      {view === "week" && (
        <AgendaWeekView weekStart={startOfWeek(anchor)} appointments={appointments} />
      )}
      {view === "month" && (
        <AgendaMonthView
          monthAnchor={anchor}
          appointments={appointments}
          onSelectDay={(dateKey, dayAppts) => setDayDetail({ dateKey, appointments: dayAppts })}
        />
      )}

      <NewAppointmentDialog
        open={newApptOpen}
        onOpenChange={setNewApptOpen}
        services={services}
        doctors={doctors}
        defaultDate={toClinicDateKey(anchor)}
        onCreated={reload}
      />

      {dayDetail && (
        <DayDetailDialog
          open={!!dayDetail}
          onOpenChange={(open) => !open && setDayDetail(null)}
          dateLabel={dayDetail.dateKey}
          appointments={dayDetail.appointments}
        />
      )}
    </div>
  );
}
