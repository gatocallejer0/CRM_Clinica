"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { TriangleAlertIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import { ChartTooltip } from "./chart-tooltip";
import type { MonthPoint } from "../dashboard-metrics";

/**
 * Columnas mensuales genéricas — usado tanto para ingresos como para
 * cantidad de citas, últimos N meses. El mes en curso se resalta con el
 * color de acento; los anteriores quedan en un tono neutro de ese mismo
 * color (no es una escala de valor: todas las barras miden lo mismo).
 */
export function MonthlyBarChartCard({
  title,
  icon,
  points,
  valueKind,
  color = "var(--primary)",
  error,
  emptyMessage,
}: {
  title: string;
  /** Ícono ya renderizado (ej. `<WalletIcon className="size-[18px]" strokeWidth={1.75} />`) — un
   * componente sin instanciar no se puede pasar de un Server Component a este client component. */
  icon: React.ReactNode;
  points: MonthPoint[];
  valueKind: "currency" | "count";
  color?: string;
  error?: boolean;
  emptyMessage: string;
}) {
  const allZero = points.every((p) => p.value === 0);
  const lastIndex = points.length - 1;
  const formatValue = (v: number) => (valueKind === "currency" ? formatCurrency(v) : `${v} cita${v === 1 ? "" : "s"}`);

  return (
    <Card className="h-full gap-0 p-0">
      <CardHeader className="p-5">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col px-5 pb-5">
        {error ? (
          <EmptyState
            icon={TriangleAlertIcon}
            message="No se pudo cargar. Intenta recargar la página."
            tone="warning"
          />
        ) : allZero ? (
          <EmptyState icon={icon} message={emptyMessage} />
        ) : (
          <div className="min-h-56 w-full flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="monthLabel"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  width={valueKind === "currency" ? 48 : 28}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickFormatter={(v) => (valueKind === "currency" ? `Q${v >= 1000 ? `${Math.round(v / 1000)}K` : v}` : String(v))}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.5 }}
                  content={(props) => <ChartTooltip {...props} valueFormatter={formatValue} />}
                />
                <Bar dataKey="value" name={title} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive animationDuration={500} animationEasing="ease-out">
                  {points.map((p, i) => (
                    <Cell
                      key={p.monthKey}
                      fill={i === lastIndex ? color : `color-mix(in oklab, ${color} 40%, var(--muted))`}
                    />
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
