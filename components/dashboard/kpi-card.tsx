"use client";

import { motion } from "motion/react";
import { TrendingUpIcon, TrendingDownIcon, TriangleAlertIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Kpi = {
  label: string;
  value: number | string;
  /** Ícono ya renderizado (ej. `<UsersIcon className="size-5" strokeWidth={2} />`) — un
   * componente sin instanciar no se puede pasar de un Server Component a este client component. */
  icon: React.ReactNode;
  /** Color token para el ícono y su fondo, ej. "var(--primary)". */
  tint: string;
  /** Texto corto debajo del valor, ej. "+3 este mes". No se muestra junto con trendPct. */
  hint?: string;
  /** % con signo vs. el período anterior — se omite si no hay una base real para compararlo. */
  trendPct?: number;
  /** true si la consulta de este dato falló — se muestra un aviso en vez de un valor (probablemente 0) engañoso. */
  error?: boolean;
};

export function KpiCard({ kpi, className, delay = 0 }: { kpi: Kpi; className?: string; delay?: number }) {
  const tint = kpi.error ? "var(--status-waiting-fg)" : kpi.tint;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className={cn("h-full", className)}
    >
      <Card className="h-full gap-0 p-0">
        <CardContent className="flex h-full items-center gap-3.5 p-5">
          <span
            className="flex size-11 shrink-0 items-center justify-center rounded-2xl"
            style={{
              color: tint,
              backgroundColor: `color-mix(in oklab, ${tint} 15%, white)`,
            }}
          >
            {kpi.error ? <TriangleAlertIcon className="size-5" strokeWidth={2} /> : kpi.icon}
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-muted-foreground">{kpi.label}</p>
            {kpi.error ? (
              <p className="mt-1 truncate text-sm font-semibold" style={{ color: "var(--status-waiting-fg)" }}>
                No se pudo cargar
              </p>
            ) : (
              <>
                <div className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                  <span className="truncate font-heading text-2xl font-bold text-foreground">{kpi.value}</span>
                  {kpi.trendPct !== undefined && (
                    <span
                      className="flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap"
                      style={
                        kpi.trendPct >= 0
                          ? { color: "var(--status-confirmed-fg)", backgroundColor: "var(--status-confirmed-bg)" }
                          : { color: "var(--status-cancelled-fg)", backgroundColor: "var(--status-cancelled-bg)" }
                      }
                    >
                      {kpi.trendPct >= 0 ? (
                        <TrendingUpIcon className="size-2.5" strokeWidth={3} />
                      ) : (
                        <TrendingDownIcon className="size-2.5" strokeWidth={3} />
                      )}
                      {Math.abs(Math.round(kpi.trendPct))}% vs. anterior
                    </span>
                  )}
                </div>
                {kpi.hint && <p className="mt-0.5 text-xs text-muted-foreground">{kpi.hint}</p>}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
