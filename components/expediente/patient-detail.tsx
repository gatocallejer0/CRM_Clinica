"use client";

import { useState } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { PillIcon, DownloadIcon } from "lucide-react";
import type { PatientDetail, ClinicalRecord } from "@/app/actions/clinical-records";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  getInitials,
  computeBmi,
  computePregnancy,
  formatGestationalAge,
  pregnancySourceLabel,
  formatDateEs,
} from "./clinical-utils";

function pregnancyFromRecord(r: Pick<ClinicalRecord, "last_menstrual_period" | "estimated_due_date" | "ultrasound_date" | "ultrasound_weeks" | "ultrasound_days">) {
  return computePregnancy({
    lastMenstrualPeriod: r.last_menstrual_period,
    estimatedDueDate: r.estimated_due_date,
    ultrasoundDate: r.ultrasound_date,
    ultrasoundWeeks: r.ultrasound_weeks,
    ultrasoundDays: r.ultrasound_days,
  });
}

type Tab = "general" | "historial" | "ordenes" | "documentos";

const TABS: { value: Tab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "historial", label: "Historial de citas" },
  { value: "ordenes", label: "Órdenes médicas" },
  { value: "documentos", label: "Documentos" },
];

export function PatientDetailPane({
  patient,
  pending,
}: {
  patient: PatientDetail;
  pending: boolean;
}) {
  const [tab, setTab] = useState<Tab>("general");

  const latestRecord = patient.records[0] ?? null;
  const bmi = computeBmi(latestRecord?.weight_kg ?? null, latestRecord?.height_cm ?? null);
  const pregnancy = latestRecord ? pregnancyFromRecord(latestRecord) : null;
  const medicalOrders = patient.records.filter((r) => r.medical_orders);

  return (
    <div className={`flex flex-col gap-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <Card className="flex-row items-center gap-4 p-5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-neutral)] font-heading text-lg font-bold text-white">
          {getInitials(patient.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-lg font-semibold text-foreground">{patient.full_name}</div>
          <div className="text-sm text-muted-foreground">
            {[patient.age ? `${patient.age} años` : null, patient.blood_type, patient.phone]
              .filter(Boolean)
              .join(" · ") || patient.email}
          </div>
        </div>
        {patient.allergies && <Badge variant="destructive">Alergia: {patient.allergies}</Badge>}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/70 bg-white/50 p-1">
          {TABS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTab(t.value)}
              className={`relative rounded-xl px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                tab === t.value ? "text-primary" : "text-foreground hover:bg-accent"
              }`}
            >
              {tab === t.value && (
                <motion.div
                  layoutId="patient-detail-tab-pill"
                  className="absolute inset-0 rounded-xl bg-primary/10"
                  transition={{ type: "spring", stiffness: 500, damping: 36 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>
        <Link href={`/expediente/nuevo-registro/${patient.id}`} className={buttonVariants()}>
          + Nuevo registro
        </Link>
      </div>

      {tab === "general" && (
        <div className="flex flex-col gap-4">
          {patient.allergies && (
            <Card className="border-l-4 border-l-destructive px-5 py-4">
              <p className="text-sm font-semibold text-destructive">Alergias</p>
              <p className="text-sm text-foreground">{patient.allergies}</p>
            </Card>
          )}
          <Card className="px-5 py-4">
            <p className="mb-2 font-heading text-sm font-semibold text-foreground">Antecedentes</p>
            <p className="text-sm text-muted-foreground">
              {patient.blood_type ? `Tipo de sangre: ${patient.blood_type}.` : "Sin antecedentes registrados."}
            </p>
          </Card>
          <div className="grid grid-cols-2 gap-3 min-[640px]:grid-cols-4">
            {[
              ["Peso", latestRecord?.weight_kg ? `${latestRecord.weight_kg} kg` : "—"],
              ["Altura", latestRecord?.height_cm ? `${latestRecord.height_cm} cm` : "—"],
              ["IMC", bmi ?? "—"],
              ["Edad gestacional", pregnancy ? formatGestationalAge(pregnancy.age) : "—"],
            ].map(([label, value]) => (
              <Card key={label} className="px-4 py-3.5">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 font-heading text-xl font-bold text-foreground">{value}</p>
              </Card>
            ))}
          </div>
          {pregnancy && (
            <Card className="px-5 py-4">
              <p className="mb-2 font-heading text-sm font-semibold text-foreground">Embarazo</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  FPP: {formatDateEs(pregnancy.dueDate)}
                </span>
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  Edad gestacional: {formatGestationalAge(pregnancy.age)}
                </span>
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {pregnancySourceLabel(pregnancy.source)}.
              </p>
            </Card>
          )}
        </div>
      )}

      {tab === "historial" && (
        <Card className="px-5 py-4">
          {patient.records.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin registros todavía.</p>
          )}
          {patient.records.map((r, i) => {
            const recordBmi = computeBmi(r.weight_kg, r.height_cm);
            const recordPregnancy = pregnancyFromRecord(r);
            const metaParts = [
              r.weight_kg ? `Peso ${r.weight_kg} kg` : null,
              recordBmi ? `IMC ${recordBmi}` : null,
              recordPregnancy ? `FPP ${formatDateEs(recordPregnancy.dueDate)}` : null,
              r.ultrasound_date
                ? `USG ${formatDateEs(r.ultrasound_date)}${
                    r.ultrasound_weeks !== null ? ` (${r.ultrasound_weeks}s ${r.ultrasound_days ?? 0}d)` : ""
                  }`
                : null,
            ].filter((v): v is string => v !== null);

            return (
              <div key={r.id} className="relative flex gap-4 pl-1">
                <div className="flex flex-col items-center">
                  <div className="mt-1.5 size-[9px] shrink-0 rounded-full bg-[image:var(--gradient-neutral)]" />
                  {i < patient.records.length - 1 && <div className="w-px flex-1 bg-border" />}
                </div>
                <div className="flex-1 pb-5">
                  <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                    {formatDateEs(r.record_date)}
                  </span>
                  <p className="mt-1.5 text-sm font-medium text-foreground">{r.reason || "Consulta"}</p>
                  {r.diagnosis && <p className="text-xs text-muted-foreground">{r.diagnosis}</p>}

                  {r.evolution_notes && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Notas de evolución: </span>
                      {r.evolution_notes}
                    </p>
                  )}

                  {recordPregnancy && (
                    <span className="mt-2 inline-block rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                      Edad gestacional: {formatGestationalAge(recordPregnancy.age)}
                    </span>
                  )}

                  {metaParts.length > 0 && (
                    <p className="mt-1.5 text-xs text-muted-foreground">{metaParts.join(" · ")}</p>
                  )}

                  {r.medication && (
                    <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <PillIcon className="size-3.5" />
                          Receta
                        </div>
                        <a
                          href={`/receta/${r.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <DownloadIcon className="size-3.5" />
                          Descargar
                        </a>
                      </div>
                      <p className="mt-1.5 text-xs whitespace-pre-line text-foreground">{r.medication}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Card>
      )}

      {tab === "ordenes" && (
        <div className="flex flex-col gap-3">
          {medicalOrders.length === 0 && (
            <Card className="px-5 py-8 text-center text-sm text-muted-foreground">
              Sin órdenes médicas registradas.
            </Card>
          )}
          {medicalOrders.map((r) => (
            <Card key={r.id} className="px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground">{formatDateEs(r.record_date)}</p>
              <p className="mt-1 text-sm text-foreground">{r.medical_orders}</p>
            </Card>
          ))}
        </div>
      )}

      {tab === "documentos" && (
        <Card className="px-5 py-8 text-center text-sm text-muted-foreground">
          Próximamente: documentos adjuntos por paciente.
        </Card>
      )}
    </div>
  );
}
