"use client";

import { motion } from "motion/react";
import { Card, CardContent } from "@/components/ui/card";

export type Kpi = {
  label: string;
  value: number | string;
};

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 min-[861px]:grid-cols-4">
      {kpis.map((kpi, i) => (
        <motion.div
          key={kpi.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: i * 0.06, ease: "easeOut" }}
        >
          <Card>
            <CardContent className="px-5">
              <div className="text-xs font-semibold text-muted-foreground">{kpi.label}</div>
              <div className="mt-2 font-heading text-2xl font-bold text-foreground">
                {kpi.value}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
