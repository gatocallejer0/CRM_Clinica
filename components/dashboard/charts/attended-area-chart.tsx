"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TriangleAlertIcon, CalendarCheckIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartTooltip } from "./chart-tooltip";
import type { DailyPoint } from "../dashboard-metrics";

const COLOR = "var(--status-done-fg)";

export function AttendedAreaChart({ points, error }: { points: DailyPoint[]; error?: boolean }) {
  const allZero = points.every((p) => p.value === 0);

  return (
    <Card className="h-full gap-0 p-0">
      <CardHeader className="p-5">
        <CardTitle>Citas atendidas este mes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5 pb-5">
        {error ? (
          <EmptyState
            icon={TriangleAlertIcon}
            message="No se pudo cargar. Intenta recargar la página."
            tone="warning"
          />
        ) : allZero ? (
          <EmptyState icon={CalendarCheckIcon} message="Sin citas atendidas todavía este mes." />
        ) : (
          <div className="min-h-72 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendedFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={COLOR} stopOpacity={0.22} />
                    <stop offset="100%" stopColor={COLOR} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
                <XAxis
                  dataKey="dayLabel"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  interval="preserveStartEnd"
                  minTickGap={20}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
                  content={(props) => (
                    <ChartTooltip {...props} valueFormatter={(v) => `${v} cita${v === 1 ? "" : "s"} atendida${v === 1 ? "" : "s"}`} />
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="Atendidas"
                  stroke={COLOR}
                  strokeWidth={2}
                  fill="url(#attendedFill)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                  isAnimationActive
                  animationDuration={500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
