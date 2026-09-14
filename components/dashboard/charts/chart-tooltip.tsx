"use client";

import type { TooltipContentProps } from "recharts";

/**
 * Tooltip compartido por todas las gráficas del Dashboard — mismo look que
 * los tooltips de barra ya existentes en Cobros (`bar-chart.tsx`): valor en
 * negrita primero, nombre de la serie después, "line key" de color en vez de
 * un cuadro relleno (menos tinta de dato que no es dato).
 */
export function ChartTooltip({
  active,
  payload,
  label,
  valueFormatter = (v) => String(v),
}: TooltipContentProps & { valueFormatter?: (value: number) => string }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs whitespace-nowrap text-popover-foreground shadow-[var(--shadow-glass-lg)] ring-1 ring-white/80">
      {label !== undefined && <p className="mb-1 font-medium text-muted-foreground">{label}</p>}
      <div className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey ?? i}`} className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: (entry.color ?? entry.payload?.fill) as string }}
            />
            <span className="font-semibold text-foreground">
              {valueFormatter(typeof entry.value === "number" ? entry.value : Number(entry.value))}
            </span>
            {/* Con una sola serie el título de la tarjeta ya dice qué se grafica — repetir el
                nombre en el tooltip sería ruido, no identidad (ver marks-and-anatomy.md). */}
            {payload.length > 1 && entry.name && <span className="text-muted-foreground">{entry.name}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
