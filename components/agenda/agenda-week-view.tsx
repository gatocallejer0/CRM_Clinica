import type { Appointment, ServiceCategory } from "@/app/actions/appointments";
import {
  addDays,
  formatClinicTime,
  formatClinicWeekday,
  formatClinicDayNumber,
  toClinicDateKey,
} from "@/lib/clinic-time";
import { CATEGORY_COLOR, CATEGORY_LABELS } from "./appointment-meta";

const CATEGORIES: ServiceCategory[] = ["prenatal", "general", "seguimiento"];

export function AgendaWeekView({
  weekStart,
  appointments,
}: {
  weekStart: Date;
  appointments: Appointment[];
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const appointmentsByDay = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const key = toClinicDateKey(new Date(a.scheduled_at));
    const list = appointmentsByDay.get(key) ?? [];
    list.push(a);
    appointmentsByDay.set(key, list);
  }

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-wrap gap-4.5">
        {CATEGORIES.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLOR[cat] }} />
            {CATEGORY_LABELS[cat]}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2.5 min-[861px]:grid-cols-7">
        {days.map((day) => {
          const dateKey = toClinicDateKey(day);
          const dayAppointments = appointmentsByDay.get(dateKey) ?? [];

          return (
            <div
              key={dateKey}
              className="min-h-[400px] overflow-hidden rounded-2xl border border-white/65 bg-white/40"
            >
              <div className="border-b border-[rgba(210,170,180,0.25)] px-3 py-2.5 text-center">
                <div className="text-[11px] font-bold text-muted-foreground uppercase">
                  {formatClinicWeekday(day)}
                </div>
                <div className="font-heading text-base font-bold text-foreground">
                  {formatClinicDayNumber(day)}
                </div>
              </div>
              <div className="flex flex-col gap-1.5 p-2">
                {dayAppointments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-[10px] p-2"
                    style={{
                      backgroundColor: `color-mix(in oklch, ${CATEGORY_COLOR[a.service_category]} 12%, white)`,
                      borderLeft: `3px solid ${CATEGORY_COLOR[a.service_category]}`,
                    }}
                  >
                    <div
                      className="text-[11px] font-bold whitespace-nowrap"
                      style={{ color: CATEGORY_COLOR[a.service_category] }}
                    >
                      {formatClinicTime(new Date(a.scheduled_at))}
                    </div>
                    <div className="truncate text-xs font-semibold text-foreground">
                      {a.patient_name}
                    </div>
                    <div className="truncate text-[10.5px] text-muted-foreground">
                      {a.service_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
