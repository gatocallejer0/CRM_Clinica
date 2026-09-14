"use client";

import { useMemo } from "react";
import {
  ChartColumnIcon,
  PackageIcon,
  ReceiptIcon,
  StethoscopeIcon,
  TrendingDownIcon,
  TrendingUpIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react";
import type { SaleRow } from "@/app/actions/catalog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import { getMonthlyRevenue, getMonthOverMonthDelta, getSalesSummary, getTopItems, getTopSellers } from "./sales-metrics";
import { RankingBarChart, MonthlyBarChart } from "./bar-chart";

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof WalletIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/50 px-4 py-3.5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-4.5" strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
        <p className="truncate font-heading text-lg font-bold text-foreground">{value}</p>
        {hint && <p className="truncate text-[11px] text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  trailing,
}: {
  icon: typeof ChartColumnIcon;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" strokeWidth={2.25} />
        </div>
        <p className="font-heading text-sm font-semibold text-foreground">{title}</p>
      </div>
      {trailing}
    </div>
  );
}

export function SalesMetricsDialog({
  sales,
  open,
  onOpenChange,
}: {
  sales: SaleRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const summary = useMemo(() => getSalesSummary(sales), [sales]);
  const months = useMemo(() => getMonthlyRevenue(sales), [sales]);
  const topItems = useMemo(() => getTopItems(sales), [sales]);
  const topSellers = useMemo(() => getTopSellers(sales), [sales]);

  const monthDeltaPct = useMemo(() => getMonthOverMonthDelta(sales), [sales]);

  const productShare =
    summary.totalRevenue > 0 ? Math.round((summary.productRevenue / summary.totalRevenue) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* initialFocus={false}: por defecto el diálogo enfoca el primer elemento
          tabbable al abrir — que aquí es la primera barra del gráfico mensual,
          disparando su tooltip pegado al título apenas se abre. */}
      <DialogContent className="sm:max-w-3xl" initialFocus={false}>
        <DialogHeader>
          <DialogTitle>Métricas de cobros</DialogTitle>
          <DialogDescription>
            Según las ventas que coinciden con los filtros actuales del listado (los borradores no cuentan).
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <StatCard icon={WalletIcon} label="Total vendido" value={formatCurrency(summary.totalRevenue)} />
            <StatCard
              icon={ReceiptIcon}
              label="Ventas"
              value={String(summary.salesCount)}
              hint={summary.salesCount > 0 ? `Ticket prom. ${formatCurrency(summary.avgTicket)}` : undefined}
            />
            <StatCard
              icon={PackageIcon}
              label="Productos vs. servicios"
              value={summary.totalRevenue > 0 ? `${productShare}% / ${100 - productShare}%` : "—"}
            />
          </div>

          <section className="flex flex-col gap-3">
            <SectionHeader
              icon={ChartColumnIcon}
              title="Ingresos por mes"
              trailing={
                monthDeltaPct !== null && (
                  <span
                    className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={
                      monthDeltaPct >= 0
                        ? { color: "var(--status-confirmed-fg)", backgroundColor: "var(--status-confirmed-bg)" }
                        : { color: "var(--status-cancelled-fg)", backgroundColor: "var(--status-cancelled-bg)" }
                    }
                  >
                    {monthDeltaPct >= 0 ? (
                      <TrendingUpIcon className="size-3" strokeWidth={2.5} />
                    ) : (
                      <TrendingDownIcon className="size-3" strokeWidth={2.5} />
                    )}
                    {Math.abs(Math.round(monthDeltaPct))}% vs. mismo período anterior
                  </span>
                )
              }
            />
            {months.every((m) => m.total === 0) ? (
              <EmptyState icon={ChartColumnIcon} message="Sin ventas en los últimos meses." />
            ) : (
              <MonthlyBarChart months={months} />
            )}
          </section>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <section className="flex flex-col gap-3">
              <SectionHeader icon={PackageIcon} title="Más vendidos" />
              {topItems.length === 0 ? (
                <EmptyState icon={PackageIcon} message="Sin productos o servicios vendidos todavía." />
              ) : (
                <RankingBarChart
                  rows={topItems.map((i) => ({
                    name: i.name,
                    value: i.quantity,
                    secondary: formatCurrency(i.revenue),
                    icon: i.kind === "service" ? StethoscopeIcon : PackageIcon,
                    color: i.kind === "service" ? "var(--primary)" : "var(--chart-3)",
                  }))}
                  valueLabel="unidades"
                  formatValue={(v) => `${v} un.`}
                />
              )}
            </section>

            <section className="flex flex-col gap-3">
              <SectionHeader icon={UsersIcon} title="Equipo con más ventas" />
              {topSellers.length === 0 ? (
                <EmptyState icon={UsersIcon} message="Sin ventas registradas todavía." />
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
