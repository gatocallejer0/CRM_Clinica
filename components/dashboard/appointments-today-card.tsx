import Link from "next/link";
import { CalendarDaysIcon, ArrowUpRightIcon, TriangleAlertIcon } from "lucide-react";
import type { Appointment } from "@/app/actions/appointments";
import { formatClinicTime } from "@/lib/clinic-time";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Reemplaza el KPI simple de "Citas de hoy" + la tarjeta de Agenda de hoy:
 * mitad izquierda es el KPI de siempre (cantidad + confirmadas), mitad
 * derecha adelanta las próximas 2 citas sin salir del Dashboard, con un
 * acceso directo a la agenda completa.
 */
export function AppointmentsTodayCard({
  appointments,
  upcoming,
  error,
  className,
}: {
  appointments: Appointment[];
  /** Próximas 2 citas de hoy (ya filtradas y ordenadas por el llamador) que aún no pasan. */
  upcoming: Appointment[];
  error?: boolean;
  className?: string;
}) {
  const confirmed = appointments.filter((a) => a.status === "confirmada").length;
  const tint = error ? "var(--status-waiting-fg)" : "var(--primary)";

  return (
    <Card className={cn("h-full gap-0 p-0", className)}>
      <CardContent className="grid h-full grid-cols-2 divide-x divide-border p-0">
        <div className="flex items-center gap-3.5 p-5">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
            style={{ color: tint, backgroundColor: `color-mix(in oklab, ${tint} 15%, white)` }}
          >
            {error ? (
              <TriangleAlertIcon className="size-5" strokeWidth={2} />
            ) : (
              <CalendarDaysIcon className="size-5" strokeWidth={2} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-muted-foreground">Citas de hoy</p>
            {error ? (
              <p className="mt-1 truncate text-sm font-semibold" style={{ color: "var(--status-waiting-fg)" }}>
                No se pudo cargar
              </p>
            ) : (
              <>
                <span className="truncate font-heading text-2xl font-bold text-foreground">
                  {appointments.length}
                </span>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {appointments.length > 0
                    ? `${confirmed} confirmada${confirmed === 1 ? "" : "s"}`
                    : "Sin citas programadas"}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-muted-foreground">Próximas citas</p>
            <Link
              href="/agenda"
              aria-label="Ver agenda completa"
              className="text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowUpRightIcon className="size-3.5" strokeWidth={2.25} />
            </Link>
          </div>
          {error ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : upcoming.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin más citas hoy.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {upcoming.map((a) => (
                <div key={a.id} className="flex items-baseline gap-1.5">
                  <span className="shrink-0 text-xs font-semibold text-foreground">
                    {formatClinicTime(new Date(a.scheduled_at))}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                    {a.patient_name} · {a.service_name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
