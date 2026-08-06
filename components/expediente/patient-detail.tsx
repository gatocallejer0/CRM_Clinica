"use client";

import { useState } from "react";
import type { PatientDetail } from "@/app/actions/clinical-records";
import type { DoctorOption } from "@/app/actions/appointments";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewClinicalRecordDialog } from "./new-clinical-record-dialog";
import { getInitials, computeBmi, computeGestationalWeeks, formatDateEs } from "./clinical-utils";

type Tab = "general" | "historial" | "recetas" | "documentos";

const TABS: { value: Tab; label: string }[] = [
  { value: "general", label: "General" },
  { value: "historial", label: "Historial de citas" },
  { value: "recetas", label: "Recetas" },
  { value: "documentos", label: "Documentos" },
];

export function PatientDetailPane({
  patient,
  doctors,
  isAdmin,
  pending,
  onRecordCreated,
}: {
  patient: PatientDetail;
  doctors: DoctorOption[];
  isAdmin: boolean;
  pending: boolean;
  onRecordCreated: () => void;
}) {
  const [tab, setTab] = useState<Tab>("general");
  const [dialogOpen, setDialogOpen] = useState(false);

  const latestRecord = patient.records[0] ?? null;
  const bmi = computeBmi(latestRecord?.weight_kg ?? null, latestRecord?.height_cm ?? null);
  const gestationalWeeks = computeGestationalWeeks(latestRecord?.last_menstrual_period ?? null);
  const prescriptions = patient.records.filter((r) => r.medication);

  return (
    <div className={`flex flex-col gap-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <Card className="flex-row items-center gap-4 p-5">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] font-heading text-lg font-bold text-white">
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
              className={`rounded-xl px-3.5 py-1.5 text-[13px] font-semibold whitespace-nowrap transition-colors ${
                tab === t.value
                  ? "bg-[image:var(--gradient-primary)] text-white"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Button onClick={() => setDialogOpen(true)}>+ Nuevo registro</Button>
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
              ["Semanas de embarazo", gestationalWeeks !== null ? String(gestationalWeeks) : "—"],
            ].map(([label, value]) => (
              <Card key={label} className="px-4 py-3.5">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="mt-1 font-heading text-xl font-bold text-foreground">{value}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === "historial" && (
        <Card className="px-5 py-4">
          {patient.records.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin registros todavía.</p>
          )}
          {patient.records.map((r, i) => (
            <div key={r.id} className="relative flex gap-4 pl-1">
              <div className="flex flex-col items-center">
                <div className="mt-1.5 size-[9px] shrink-0 rounded-full bg-[image:var(--gradient-primary)]" />
                {i < patient.records.length - 1 && <div className="w-px flex-1 bg-border" />}
              </div>
              <div className="flex-1 pb-5">
                <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-accent-foreground">
                  {formatDateEs(r.record_date)}
                </span>
                <p className="mt-1.5 text-sm font-medium text-foreground">{r.reason || "Consulta"}</p>
                {r.diagnosis && <p className="text-xs text-muted-foreground">{r.diagnosis}</p>}
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab === "recetas" && (
        <div className="flex flex-col gap-3">
          {prescriptions.length === 0 && (
            <Card className="px-5 py-8 text-center text-sm text-muted-foreground">
              Sin recetas registradas.
            </Card>
          )}
          {prescriptions.map((r) => (
            <Card key={r.id} className="px-5 py-4">
              <p className="text-xs font-medium text-muted-foreground">{formatDateEs(r.record_date)}</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{r.medication}</p>
              {r.medication_instructions && (
                <p className="text-sm text-muted-foreground">{r.medication_instructions}</p>
              )}
            </Card>
          ))}
        </div>
      )}

      {tab === "documentos" && (
        <Card className="px-5 py-8 text-center text-sm text-muted-foreground">
          Próximamente: documentos adjuntos por paciente.
        </Card>
      )}

      <NewClinicalRecordDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        patientId={patient.id}
        doctors={doctors}
        showDoctorSelect={isAdmin}
        onCreated={onRecordCreated}
      />
    </div>
  );
}
