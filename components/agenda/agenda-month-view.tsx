import type { Appointment } from "@/app/actions/appointments";
import { addDays, startOfWeek, startOfMonth, toClinicDateKey, formatClinicDayNumber } from "@/lib/clinic-time";

const WEEKDAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function AgendaMonthView({
  monthAnchor,
  appointments,
  onSelectDay,
}: {
  monthAnchor: Date;
  appointments: Appointment[];
  onSelectDay: (dateKey: string, appointmentsForDay: Appointment[]) => void;
}) {
  const monthStart = startOfMonth(monthAnchor);
  const monthKey = toClinicDateKey(monthStart).slice(0, 7);
  const gridStart = startOfWeek(monthStart);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  const appointmentsByDay = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const key = toClinicDateKey(new Date(a.scheduled_at));
    const list = appointmentsByDay.get(key) ?? [];
    list.push(a);
    appointmentsByDay.set(key, list);
  }

  return (
    <div className="grid grid-cols-7 gap-2">
      {WEEKDAY_NAMES.map((w) => (
        <div key={w} className="pb-1.5 text-center text-[11px] font-bold text-muted-foreground uppercase">
          {w}
        </div>
      ))}
      {days.map((day) => {
        const dateKey = toClinicDateKey(day);
        const inMonth = dateKey.slice(0, 7) === monthKey;
        const dayAppointments = appointmentsByDay.get(dateKey) ?? [];
        const hasAppointments = dayAppointments.length > 0;

        return (
          <button
            key={dateKey}
            type="button"
            disabled={!hasAppointments}
            onClick={() => hasAppointments && onSelectDay(dateKey, dayAppointments)}
            className={`group relative min-h-[88px] rounded-2xl border border-white/60 p-2 text-left transition-transform active:scale-[0.97] ${
              inMonth ? "bg-white/45" : "bg-white/15"
            } ${hasAppointments ? "cursor-pointer hover:shadow-[0_6px_16px_rgba(190,120,130,0.15)]" : "cursor-default"}`}
          >
            <div className="flex items-center justify-between">
              <span
                className={`text-xs ${inMonth ? "font-semibold text-foreground" : "text-muted-foreground/60"}`}
              >
                {formatClinicDayNumber(day)}
              </span>
              {hasAppointments && (
                <span className="rounded-full bg-[image:var(--gradient-primary)] px-1.5 text-[10px] font-bold text-white">
                  {dayAppointments.length}
                </span>
              )}
            </div>
            {hasAppointments && (
              <div className="mt-1 hidden text-[9px] leading-tight text-muted-foreground group-hover:block">
                {dayAppointments.slice(0, 3).map((a) => (
                  <div key={a.id} className="truncate">
                    {a.patient_name}
                  </div>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
