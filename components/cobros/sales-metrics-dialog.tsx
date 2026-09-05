"use client";

import { useMemo } from "react";
import { ChartColumnIcon, PackageIcon, UserIcon } from "lucide-react";
import type { SaleRow } from "@/app/actions/catalog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import { getMonthlyRevenue, getTopItems, getTopSellers } from "./sales-metrics";
import { RankingBarChart, MonthlyBarChart } from "./bar-chart";

export function SalesMetricsDialog({
  sales,
  open,
  onOpenChange,
}: {
  sales: SaleRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const months = useMemo(() => getMonthlyRevenue(sales), [sales]);
  const topItems = useMemo(() => getTopItems(sales), [sales]);
  const topSellers = useMemo(() => getTopSellers(sales), [sales]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Métricas de cobros</DialogTitle>
          <DialogDescription>
            Según las ventas que coinciden con los filtros actuales del listado (los borradores no cuentan).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <section className="flex flex-col gap-3">
            <p className="font-heading text-sm font-semibold text-foreground">
              Monto vendido por mes
            </p>
            {months.every((m) => m.total === 0) ? (
              <EmptyState icon={ChartColumnIcon} message="Sin ventas en los últimos meses." />
            ) : (
              <MonthlyBarChart months={months} />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <p className="font-heading text-sm font-semibold text-foreground">
              Productos y servicios más vendidos
            </p>
            {topItems.length === 0 ? (
              <EmptyState icon={PackageIcon} message="Sin productos o servicios vendidos todavía." />
            ) : (
              <RankingBarChart
                rows={topItems.map((i) => ({
                  name: i.name,
                  value: i.quantity,
                  secondary: formatCurrency(i.revenue),
                }))}
                valueLabel="unidades"
                formatValue={(v) => `${v} un.`}
              />
            )}
          </section>

          <section className="flex flex-col gap-3">
            <p className="font-heading text-sm font-semibold text-foreground">
              Vendedores con más ventas
            </p>
            {topSellers.length === 0 ? (
              <EmptyState icon={UserIcon} message="Sin ventas registradas todavía." />
            ) : (
              <RankingBarChart
                rows={topSellers.map((s) => ({
                  name: s.name,
                  value: s.revenue,
                  secondary: `${s.count} venta${s.count === 1 ? "" : "s"}`,
                }))}
                valueLabel="vendido"
                formatValue={(v) => formatCurrency(v)}
              />
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
