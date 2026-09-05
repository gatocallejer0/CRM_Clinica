import Link from "next/link";
import { CalendarDaysIcon } from "lucide-react";
import type { Appointment } from "@/app/actions/appointments";
import { formatClinicTime } from "@/lib/clinic-time";
import { StatusBadge } from "@/components/agenda/status-badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

const VISIBLE_LIMIT = 6;

export function TodaysAgendaCard({ appointments }: { appointments: Appointment[] }) {
  const visible = appointments.slice(0, VISIBLE_LIMIT);
  const remaining = appointments.length - visible.length;

  return (
    <Card className="gap-0 p-0">
      <CardHeader className="p-5">
        <CardTitle>Agenda de hoy</CardTitle>
        <CardDescription>
          {appointments.length === 0
            ? "Sin citas programadas para hoy."
            : `${appointments.length} cita${appointments.length === 1 ? "" : "s"} programada${appointments.length === 1 ? "" : "s"}.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="px-0">
        {visible.length === 0 ? (
          <EmptyState icon={CalendarDaysIcon} message="Sin citas programadas para hoy." />
        ) : (
          <div className="flex flex-col">
            {visible.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 border-t border-border px-5 py-3 first:border-t-0"
              >
                <span className="w-16 shrink-0 text-sm font-semibold text-foreground">
                  {formatClinicTime(new Date(a.scheduled_at))}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{a.patient_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {a.service_name}
                    {a.doctor_name ? ` · ${a.doctor_name}` : ""}
                  </p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <CardFooter className="justify-between bg-transparent px-5 pt-1 pb-5">
        {remaining > 0 ? (
          <span className="text-xs text-muted-foreground">+{remaining} más</span>
        ) : (
          <span />
        )}
        <Link href="/agenda" className="text-sm font-semibold text-primary hover:underline">
          Ver agenda completa →
        </Link>
      </CardFooter>
    </Card>
  );
}
