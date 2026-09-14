"use client";

import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { ChartTooltip } from "./chart-tooltip";

export type DonutSlice = { name: string; value: number; color: string };

/**
 * Dona interactiva compartida — usada por "Top productos", "Atendidas vs.
 * canceladas" y el estado de citas de hoy. La rebanada bajo el cursor se
 * resalta (opacidad) en vez de solo mostrar el tooltip, para que el gráfico
 * "responda" al hover (ver reference/interaction.md del skill dataviz).
 */
export function DonutChart({
  data,
  centerValue,
  centerLabel,
  valueFormatter = (v) => String(v),
}: {
  data: DonutSlice[];
  centerValue?: string;
  centerLabel?: string;
  valueFormatter?: (value: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="relative aspect-square w-full max-w-[180px] shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="100%"
            paddingAngle={data.length > 1 ? 2 : 0}
            stroke="none"
            isAnimationActive
            animationDuration={500}
            animationEasing="ease-out"
            onMouseEnter={(_, i) => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {data.map((d, i) => (
              <Cell
                key={d.name}
                fill={d.color}
                style={{ transition: "opacity 150ms ease-out" }}
                opacity={hovered === null || hovered === i ? 1 : 0.45}
              />
            ))}
          </Pie>
          <Tooltip content={(props) => <ChartTooltip {...props} valueFormatter={valueFormatter} />} />
        </PieChart>
      </ResponsiveContainer>
      {(centerValue || centerLabel) && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="max-w-[70%] truncate font-heading text-base font-bold text-foreground">
              {centerValue}
            </span>
          )}
          {centerLabel && <span className="text-[10px] text-muted-foreground">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}

/**
 * Leyenda de texto que acompaña cada `DonutChart` — no es decorativa: es
 * cómo la composición llega a quien usa lector de pantalla o no distingue
 * bien el color, así que siempre lleva el valor y el nombre en texto plano.
 */
export function DonutLegendList({
  rows,
}: {
  rows: { name: string; color: string; value: string; sub?: string }[];
}) {
  return (
    <ul className="flex min-w-0 max-w-64 flex-col gap-2">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center gap-2 text-xs">
          <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: r.color }} />
          <span className="min-w-0 flex-1 truncate text-foreground">{r.name}</span>
          <span className="shrink-0 font-semibold text-foreground">{r.value}</span>
          {r.sub && <span className="shrink-0 text-[11px] text-muted-foreground">{r.sub}</span>}
        </li>
      ))}
    </ul>
  );
}
