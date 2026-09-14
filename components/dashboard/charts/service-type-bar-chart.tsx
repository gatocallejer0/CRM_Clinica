"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TriangleAlertIcon, StethoscopeIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartTooltip } from "./chart-tooltip";
import { CATEGORICAL_COLORS } from "./palette";
import type { ServiceCount } from "../dashboard-metrics";

const ROW_HEIGHT = 40;

export function ServiceTypeBarChart({ data, error }: { data: ServiceCount[]; error?: boolean }) {
  return (
    <Card className="h-full gap-0 p-0">
      <CardHeader className="p-5">
        <CardTitle>Citas por tipo de servicio</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5 pb-5">
        {error ? (
          <EmptyState
            icon={TriangleAlertIcon}
            message="No se pudo cargar. Intenta recargar la página."
            tone="warning"
          />
        ) : data.length === 0 ? (
          <EmptyState icon={StethoscopeIcon} message="Sin citas registradas todavía este mes." />
        ) : (
          <div style={{ minHeight: Math.max(288, data.length * ROW_HEIGHT) }} className="w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data}
                layout="vertical"
                barCategoryGap={10}
                margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="var(--border)" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  width={140}
                  tick={{ fill: "var(--foreground)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  content={(props) => <ChartTooltip {...props} valueFormatter={(v) => `${v} cita${v === 1 ? "" : "s"}`} />}
                />
                <Bar
                  dataKey="count"
                  name="Citas"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={22}
                  isAnimationActive
                  animationDuration={500}
                  animationEasing="ease-out"
                >
                  {data.map((d, i) => (
                    <Cell key={d.name} fill={CATEGORICAL_COLORS[i % CATEGORICAL_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
