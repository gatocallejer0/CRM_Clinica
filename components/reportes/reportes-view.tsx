"use client";

import { useState } from "react";
import { ComingSoon } from "@/components/coming-soon";
import { OperationalReportView } from "./operational-report";
import { PatientsReportView } from "./patients-report";
import { AuditReportView } from "./audit-report";

type Tab = "financiero" | "operativo" | "pacientes" | "auditoria";

const TABS: { value: Tab; label: string }[] = [
  { value: "financiero", label: "Financiero" },
  { value: "operativo", label: "Operativo" },
  { value: "pacientes", label: "Pacientes" },
  { value: "auditoria", label: "Auditoría" },
];

export function ReportesView() {
  const [tab, setTab] = useState<Tab>("financiero");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted-foreground">Reportes de operación, pacientes y auditoría de la clínica.</p>

      <div className="flex w-fit flex-wrap items-center gap-1.5 rounded-2xl border border-white/70 bg-white/50 p-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors ${
              tab === t.value ? "bg-primary/10 text-primary" : "text-foreground hover:bg-accent"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "financiero" && (
        <ComingSoon
          title="Reporte financiero"
          description="Próximamente: tabla mensual (Citas, Ingresos, Gastos, Utilidad neta) y detalle de gastos — depende del módulo Cobros y pagos, que todavía no existe."
        />
      )}
      {tab === "operativo" && <OperationalReportView />}
      {tab === "pacientes" && <PatientsReportView />}
      {tab === "auditoria" && <AuditReportView />}
    </div>
  );
}
