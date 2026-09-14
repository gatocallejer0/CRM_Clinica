"use client";

import { useRef, useState, useImperativeHandle, forwardRef } from "react";
import FullCalendar from "@fullcalendar/react";
import type {
  DateSelectArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
} from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { Appointment, OverlapConflict } from "@/app/actions/appointments";
import { rescheduleAppointment } from "@/app/actions/appointments";
import type { GoogleReservation } from "@/app/actions/google-calendar";
import { toClinicDateKey, toClinicTimeKey } from "@/lib/clinic-time";
import { STATUS_STYLE } from "./appointment-meta";
import { OverlapWarning } from "./overlap-warning";

export type CalendarViewName = "timeGridDay" | "timeGridWeek" | "dayGridMonth" | "listMonth";

export type CalendarApiHandle = {
  changeView: (view: CalendarViewName) => void;
  prev: () => void;
  next: () => void;
  today: () => void;
};

function EventBody({ arg }: { arg: EventContentArg }) {
  const isList = arg.view.type === "listMonth";
  const reservation = arg.event.extendedProps.reservation as GoogleReservation | undefined;

  if (reservation) {
    return (
      <div
        className={`flex w-full items-center gap-1.5 overflow-hidden text-[11px] leading-tight ${isList ? "" : "px-1 py-0.5"}`}
      >
        {arg.timeText && !isList && (
          <span className="shrink-0 font-bold whitespace-nowrap text-muted-foreground">
            {arg.timeText}
          </span>
        )}
        <span className="truncate font-medium text-muted-foreground italic">
          Reservado (Google Calendar)
        </span>
      </div>
    );
  }

  // El evento "mirror" que dibuja selectMirror mientras se arrastra una
  // selección no trae extendedProps (no es una cita real todavía).
  const appt = arg.event.extendedProps.appointment as Appointment | undefined;
  if (!appt) return null;

  const color = STATUS_STYLE[appt.status].color;

  return (
    <div
      className={`flex w-full items-center gap-1.5 overflow-hidden text-[11px] leading-tight ${isList ? "" : "px-1 py-0.5"}`}
    >
      {arg.timeText && !isList && (
        <span className="shrink-0 font-bold whitespace-nowrap" style={{ color }}>
          {arg.timeText}
        </span>
      )}
      <span className="truncate font-medium">{appt.patient_name}</span>
      {isList && <span className="truncate text-muted-foreground">· {appt.service_name}</span>}
    </div>
  );
}

export const FullCalendarView = forwardRef<
  CalendarApiHandle,
  {
    appointments: Appointment[];
    reservations: GoogleReservation[];
    initialView: CalendarViewName;
    onDatesSet: (info: { title: string; startISO: string; endISO: string }) => void;
    onRequestCreate: (input: { date: string; time: string }) => void;
    onRequestEdit: (appointment: Appointment) => void;
    onRequestAssignReservation: (reservation: GoogleReservation) => void;
    onChanged: () => void;
  }
>(function FullCalendarView(
  {
    appointments,
    reservations,
    initialView,
    onDatesSet,
    onRequestCreate,
    onRequestEdit,
    onRequestAssignReservation,
    onChanged,
  },
  ref,
) {
  const calendarRef = useRef<FullCalendar | null>(null);
  // Traslape detectado al arrastrar una cita a un horario ocupado — se
  // resuelve con el mismo aviso en línea que usa el formulario de cita
  // (OverlapWarning), no con un window.confirm() nativo que rompería la
  // consistencia visual justo en un momento de decisión. La cita se queda
  // visualmente en su nueva posición mientras se pregunta; "revert()" solo
  // se llama si la usuaria cancela.
  const [pendingDrop, setPendingDrop] = useState<{
    info: EventDropArg;
    overlap: OverlapConflict[];
  } | null>(null);

  useImperativeHandle(ref, () => ({
    changeView: (view) => calendarRef.current?.getApi().changeView(view),
    prev: () => calendarRef.current?.getApi().prev(),
    next: () => calendarRef.current?.getApi().next(),
    today: () => calendarRef.current?.getApi().today(),
  }));

  const events = [
    ...appointments.map((a) => {
      const start = new Date(a.scheduled_at);
      const end = new Date(start.getTime() + a.duration_minutes * 60000);
      const { color, backgroundColor } = STATUS_STYLE[a.status];
      return {
        id: a.id,
        title: a.patient_name,
        start: a.scheduled_at,
        end: end.toISOString(),
        backgroundColor,
        borderColor: color,
        textColor: "var(--foreground)",
        extendedProps: { appointment: a },
      };
    }),
    ...reservations.map((r) => ({
      id: `gcal-${r.googleEventId}`,
      title: "Reservado (Google Calendar)",
      start: r.startISO,
      end: r.endISO,
      backgroundColor: "color-mix(in oklch, var(--muted-foreground) 10%, white)",
      borderColor: "var(--muted-foreground)",
      textColor: "var(--muted-foreground)",
      editable: false,
      extendedProps: { reservation: r },
    })),
  ];

  function handleSelect(info: DateSelectArg) {
    onRequestCreate({
      date: toClinicDateKey(info.start),
      time: info.allDay ? "" : toClinicTimeKey(info.start),
    });
    info.view.calendar.unselect();
  }

  function handleEventClick(info: EventClickArg) {
    const reservation = info.event.extendedProps.reservation as GoogleReservation | undefined;
    if (reservation) {
      onRequestAssignReservation(reservation);
      return;
    }
    onRequestEdit(info.event.extendedProps.appointment as Appointment);
  }

  async function handleEventDrop(info: EventDropArg) {
    const newStart = info.event.start;
    if (!newStart) {
      info.revert();
      return;
    }
    const result = await rescheduleAppointment(info.event.id, newStart.toISOString());

    if (result.overlap && result.overlap.length > 0) {
      setPendingDrop({ info, overlap: result.overlap });
      return;
    }

    if (result.error) {
      info.revert();
    } else {
      onChanged();
    }
  }

  function handleCancelOverlapDrop() {
    pendingDrop?.info.revert();
    setPendingDrop(null);
  }

  async function handleConfirmOverlapDrop() {
    if (!pendingDrop) return;
    const newStart = pendingDrop.info.event.start;
    if (!newStart) {
      pendingDrop.info.revert();
      setPendingDrop(null);
      return;
    }
    const result = await rescheduleAppointment(pendingDrop.info.event.id, newStart.toISOString(), true);
    if (result.error) {
      pendingDrop.info.revert();
    } else {
      onChanged();
    }
    setPendingDrop(null);
  }

  return (
    <div className="clinic-calendar relative">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        initialView={initialView}
        headerToolbar={false}
        locale={esLocale}
        // timeZone se deja en "local" (default): un timeZone IANA con
        // nombre requiere el plugin moment-timezone/luxon para convertir de
        // verdad — sin él, FullCalendar toma los dígitos UTC tal cual y los
        // muestra como si fueran hora local. El personal siempre opera desde
        // Guatemala, así que "local" ya da la hora correcta sin esa
        // dependencia extra.
        height={700}
        firstDay={1}
        slotMinTime="05:00:00"
        slotMaxTime="22:00:00"
        nowIndicator
        selectable
        selectMirror
        editable
        eventStartEditable
        eventDurationEditable={false}
        dayMaxEvents={3}
        events={events}
        select={handleSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventContent={(arg) => <EventBody arg={arg} />}
        datesSet={(info) =>
          onDatesSet({
            title: info.view.title,
            startISO: info.start.toISOString(),
            endISO: info.end.toISOString(),
          })
        }
        buttonText={{ today: "Hoy" }}
        noEventsText="Sin citas programadas."
        allDaySlot={false}
      />

      {pendingDrop && (
        <div className="absolute inset-x-4 bottom-4 z-30 mx-auto w-auto max-w-md sm:right-4 sm:left-auto">
          <OverlapWarning
            overlap={pendingDrop.overlap}
            onDismiss={handleCancelOverlapDrop}
            onConfirm={handleConfirmOverlapDrop}
            dismissLabel="Cancelar"
            confirmLabel="Agendar de todas formas"
          />
        </div>
      )}
    </div>
  );
});
