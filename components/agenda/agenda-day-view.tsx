import type { Appointment } from "@/app/actions/appointments";
import { formatClinicTime } from "@/lib/clinic-time";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "./status-badge";

export function AgendaDayView({ appointments }: { appointments: Appointment[] }) {
  if (appointments.length === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        Sin citas programadas este día.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {appointments.map((a) => (
        <Card key={a.id} className="flex-row items-center gap-4 px-5 py-4">
          <div className="w-16 shrink-0 font-heading text-[15px] font-bold text-primary">
            {formatClinicTime(new Date(a.scheduled_at))}
          </div>
          <div className="h-8 w-px shrink-0 bg-border" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">{a.patient_name}</div>
            <div className="truncate text-xs text-muted-foreground">
              {a.service_name} · {a.doctor_name ?? "Sin doctora asignada"}
            </div>
          </div>
          <StatusBadge status={a.status} />
        </Card>
      ))}
    </div>
  );
}
