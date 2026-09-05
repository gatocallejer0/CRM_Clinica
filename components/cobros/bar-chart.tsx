"use client";

import { useState } from "react";
import { formatCurrency, formatCompactCurrency } from "@/lib/format";

/** Barra horizontal de ranking (1 sola serie => 1 solo tono, sin leyenda). */
export function RankingBarChart({
  rows,
  valueLabel,
  formatValue = (v) => String(v),
}: {
  rows: { name: string; value: number; secondary?: string }[];
  valueLabel: string;
  formatValue?: (value: number) => string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((row, i) => (
        <div
          key={row.name}
          className="group/bar relative flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-muted/50"
          tabIndex={0}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(i)}
          onBlur={() => setHovered(null)}
        >
          <span className="w-36 shrink-0 truncate text-sm text-foreground" title={row.name}>
            {row.name}
          </span>
          <div className="h-6 min-w-0 flex-1 rounded-[4px] bg-muted/60">
            <div
              className="h-6 rounded-[4px] bg-primary transition-[width]"
              style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
            />
          </div>
          <span className="shrink-0 text-right text-sm font-semibold whitespace-nowrap text-foreground">
            {formatValue(row.value)}
          </span>

          {hovered === i && (
            <div className="absolute top-full left-1.5 z-10 mt-1 rounded-lg bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-[var(--shadow-glass-lg)] ring-1 ring-white/80">
              <p className="font-semibold">{formatValue(row.value)}</p>
              <p className="text-muted-foreground">
                {valueLabel} · {row.name}
                {row.secondary ? ` · ${row.secondary}` : ""}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Columnas verticales para comparar un monto mes a mes (1 sola serie => 1 solo tono). */
export function MonthlyBarChart({ months }: { months: { monthKey: string; monthLabel: string; total: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.total));
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="flex items-end justify-between gap-2 border-b border-border pt-6 pb-1">
      {months.map((m, i) => (
        <div
          key={m.monthKey}
          className="group/col relative flex min-w-0 flex-1 flex-col items-center gap-1.5"
          tabIndex={0}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          onFocus={() => setHovered(i)}
          onBlur={() => setHovered(null)}
        >
          <span className="text-xs font-medium whitespace-nowrap text-muted-foreground">
            {formatCompactCurrency(m.total)}
          </span>
          <div className="flex h-28 w-full max-w-6 items-end rounded-t-[4px] bg-muted/40">
            <div
              className="w-full rounded-t-[4px] bg-primary transition-[height] group-hover/col:brightness-110"
              style={{ height: `${Math.max(m.total > 0 ? 3 : 0, (m.total / max) * 100)}%` }}
            />
          </div>
          <span className="max-w-full truncate text-[11px] text-muted-foreground capitalize">
            {m.monthLabel.split(" ")[0]}
          </span>

          {hovered === i && (
            <div className="absolute bottom-full z-10 mb-1.5 rounded-lg bg-popover px-2.5 py-1.5 text-xs whitespace-nowrap text-popover-foreground shadow-[var(--shadow-glass-lg)] ring-1 ring-white/80">
              <p className="font-semibold">{formatCurrency(m.total)}</p>
              <p className="text-muted-foreground capitalize">{m.monthLabel}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
