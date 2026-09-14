"use client";

import { TriangleAlertIcon, PackageIcon } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import { DonutChart, DonutLegendList } from "./donut-chart";
import { CATEGORICAL_COLORS } from "./palette";
import type { ProductShare } from "../dashboard-metrics";

export function TopProductsDonutChart({
  top,
  totalRevenue,
  error,
}: {
  top: ProductShare[];
  totalRevenue: number;
  error?: boolean;
}) {
  return (
    <Card className="h-full gap-0 p-0">
      <CardHeader className="p-5">
        <CardTitle>Top {top.length || 7} productos vendidos</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-center px-5 pb-5">
        {error ? (
          <EmptyState
            icon={TriangleAlertIcon}
            message="No se pudo cargar. Intenta recargar la página."
            tone="warning"
          />
        ) : top.length === 0 ? (
          <EmptyState icon={PackageIcon} message="Sin productos vendidos todavía este mes." />
        ) : (
          <div className="flex flex-wrap items-center justify-center gap-8 py-3">
            <DonutChart
              data={top.map((p, i) => ({ name: p.name, value: p.revenue, color: CATEGORICAL_COLORS[i] }))}
              centerValue={formatCurrency(totalRevenue)}
              centerLabel="Total vendido"
              valueFormatter={(v) => formatCurrency(v)}
            />
            <DonutLegendList
              rows={top.map((p, i) => ({
                name: p.name,
                color: CATEGORICAL_COLORS[i],
                value: `${Math.round(p.pct)}%`,
                sub: formatCurrency(p.revenue),
              }))}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
