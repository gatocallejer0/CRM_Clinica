"use client";

import { useState } from "react";
import type { ServiceRow } from "@/app/actions/catalog";
import type {
  OperationalReport,
  PatientsSummaryReport,
  AtRiskPatientRow,
  PatientsDataReport,
} from "@/app/actions/reports";
import { OperationalReportView } from "./operational-report";
import { PatientsReportView } from "./patients-report";

type Tab = "operativo" | "pacientes";

const TABS: { value: Tab; label: string }[] = [
  { value: "operativo", label: "Operativo" },
  { value: "pacientes", label: "Pacientes" },
];

export function ReportesView({
  services,
  initialOperational,
  initialPatientsSummary,
  initialAtRiskPatients,
  initialPatientsData,
}: {
  services: ServiceRow[];
  initialOperational: OperationalReport;
  initialPatientsSummary: PatientsSummaryReport;
  initialAtRiskPatients: AtRiskPatientRow[];
  initialPatientsData: PatientsDataReport;
}) {
  const [tab, setTab] = useState<Tab>("operativo");

  return (
    <div className="flex flex-col gap-4">
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

      {tab === "operativo" && <OperationalReportView services={services} initialReport={initialOperational} />}
      {tab === "pacientes" && (
        <PatientsReportView
          initialData={initialPatientsData}
          initialSummary={initialPatientsSummary}
          initialAtRisk={initialAtRiskPatients}
        />
      )}
    </div>
  );
}
