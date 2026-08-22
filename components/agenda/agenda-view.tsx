"use client";

import { useEffect, useState, useTransition, useRef } from "react";
import dynamic from "next/dynamic";
import { motion } from "motion/react";
import { PlusIcon } from "lucide-react";
import {
  listAppointments,
  type Appointment,
  type Service,
  type DoctorOption,
} from "@/app/actions/appointments";
import { clinicToday, toClinicDateKey } from "@/lib/clinic-time";
import { Button } from "@/components/ui/button";
import {
  FullCalendarView,
  type CalendarViewName,
  type CalendarApiHandle,
} from "./full-calendar-view";

// AppointmentDialog arrastra react-day-picker/react-aria/date-fns (el
// selector de fecha/hora) — cargarlo estático sumaba ~750KB a cada visita de
// Agenda aunque nunca se abriera el diálogo. Se separa en su propio chunk y
// solo se monta la primera vez que el usuario abre "Nueva cita" o edita una
// cita (ver hasOpenedDialog abajo); loadAppointmentDialog además se
// pre-calienta en tiempo ocioso para que, cuando eso pase, ya esté en caché.
const loadAppointmentDialog = () => import("./appointment-dialog").then((m) => m.AppointmentDialog);
const AppointmentDialog = dynamic(loadAppointmentDialog, { ssr: false });

type ViewMode = "day" | "week" | "month" | "list";

const VIEW_TABS: { value: ViewMode; label: string; fcView: CalendarViewName }[] = [
  { value: "day", label: "Día", fcView: "timeGridDay" },
  { value: "week", label: "Semana", fcView: "timeGridWeek" },
  { value: "month", label: "Mes", fcView: "dayGridMonth" },
  { value: "list", label: "Lista", fcView: "listMonth" },
];

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
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [title, setTitle] = useState("");
  const [range, setRange] = useState<{ startISO: string; endISO: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const calendarApi = useRef<CalendarApiHandle>(null);
  const lastRangeKeyRef = useRef<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);
  const [editing, setEditing] = useState<Appointment | undefined>(undefined);
  const [createInput, setCreateInput] = useState<{ date: string; time: string } | undefined>(
    undefined,
  );
  const [hasOpenedDialog, setHasOpenedDialog] = useState(false);

  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 1));
    const cancelIdle = window.cancelIdleCallback ?? clearTimeout;
    const id = idle(() => {
      loadAppointmentDialog();
    });
    return () => cancelIdle(id);
  }, []);

  function reload(startISO: string, endISO: string) {
    startTransition(async () => {
      const data = await listAppointments(startISO, endISO);
      setAppointments(data);
    });
  }

  function handleDatesSet(info: { title: string; startISO: string; endISO: string }) {
    setTitle(info.title);
    setRange({ startISO: info.startISO, endISO: info.endISO });

    // FullCalendar fires `datesSet` twice for the same range on init (mount
    // + view sync). Skip the redundant reload so we don't hit Supabase twice.
    const key = `${info.startISO}|${info.endISO}`;
    if (lastRangeKeyRef.current === key) return;
    lastRangeKeyRef.current = key;
    reload(info.startISO, info.endISO);
  }

  function handleChanged() {
    if (range) reload(range.startISO, range.endISO);
  }

  function openCreateDialog(input?: { date: string; time: string }) {
    setEditing(undefined);
    setCreateInput(input ?? { date: toClinicDateKey(clinicToday()), time: "" });
    setDialogKey((k) => k + 1);
    setHasOpenedDialog(true);
    setDialogOpen(true);
  }

  function openEditDialog(appointment: Appointment) {
    setEditing(appointment);
    setDialogKey((k) => k + 1);
    setHasOpenedDialog(true);
    setDialogOpen(true);
  }

  function switchView(next: ViewMode) {
    setView(next);
    calendarApi.current?.changeView(VIEW_TABS.find((t) => t.value === next)!.fcView);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-2xl border border-white/70 bg-white/50 p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => switchView(tab.value)}
              className={`relative rounded-xl px-4.5 py-2 text-sm font-semibold transition-colors ${
                view === tab.value ? "text-primary" : "text-foreground hover:bg-accent"
              }`}
            >
              {view === tab.value && (
                <motion.div
                  layoutId="agenda-view-tab-pill"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <span className="relative z-10">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3.5">
          <button
            type="button"
            onClick={() => calendarApi.current?.prev()}
            className="flex size-8 items-center justify-center rounded-[10px] border border-white/80 bg-white/60 font-bold text-primary hover:bg-white/80"
          >
            ‹
          </button>
          <div className="min-w-[180px] text-center font-heading text-[15px] font-semibold text-foreground capitalize">
            {title}
          </div>
          <button
            type="button"
            onClick={() => calendarApi.current?.next()}
            className="flex size-8 items-center justify-center rounded-[10px] border border-white/80 bg-white/60 font-bold text-primary hover:bg-white/80"
          >
            ›
          </button>
          <button
            type="button"
            onClick={() => calendarApi.current?.today()}
            className="rounded-[10px] border border-white/80 bg-white/60 px-3 py-1.5 text-xs font-bold text-primary hover:bg-white/80"
          >
            Hoy
          </button>
        </div>

        <Button onClick={() => openCreateDialog()}>
          <PlusIcon />
          Nueva cita
        </Button>
      </div>

      {pending && <p className="text-xs text-muted-foreground">Actualizando...</p>}

      <FullCalendarView
        ref={calendarApi}
        appointments={appointments}
        initialView="timeGridDay"
        onDatesSet={handleDatesSet}
        onRequestCreate={(input) => openCreateDialog(input)}
        onRequestEdit={openEditDialog}
        onChanged={handleChanged}
      />

      {hasOpenedDialog && (
        <AppointmentDialog
          key={dialogKey}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          appointment={editing}
          services={services}
          doctors={doctors}
          defaultDate={createInput?.date}
          defaultTime={createInput?.time}
          onSaved={handleChanged}
        />
      )}
    </div>
  );
}
