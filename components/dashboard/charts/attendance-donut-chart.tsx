"use client";

import { TriangleAlertIcon, CalendarCheckIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { STATUS_STYLE, STATUS_LABELS } from "@/components/agenda/appointment-meta";
import { DonutChart, DonutLegendList } from "./donut-chart";

export function AttendanceDonutChart({
  atendida,
  cancelada,
  error,
}: {
  atendida: number;
  cancelada: number;
  error?: boolean;
}) {
  const total = atendida + cancelada;
  const data = [
    { name: STATUS_LABELS.atendida, value: atendida, color: STATUS_STYLE.atendida.color },
    { name: STATUS_LABELS.cancelada, value: cancelada, color: STATUS_STYLE.cancelada.color },
  ].filter((d) => d.value > 0);

  return (
    <Card className="h-full gap-0 p-0">
      <CardHeader className="p-5">
        <CardTitle>Atendidas vs. canceladas</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center px-5 pb-5">
        {error ? (
          <EmptyState
            icon={TriangleAlertIcon}
            message="No se pudo cargar. Intenta recargar la página."
            tone="warning"
          />
        ) : total === 0 ? (
          <EmptyState icon={CalendarCheckIcon} message="Sin citas atendidas o canceladas todavía este mes." />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-8 py-3">
            <DonutChart data={data} centerValue={String(total)} centerLabel="citas" />
            <DonutLegendList
              rows={data.map((d) => ({
                name: d.name,
                color: d.color,
                value: String(d.value),
                sub: `${Math.round((d.value / total) * 100)}%`,
              }))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
