"use client";

import { useState, useTransition } from "react";
import {
  getPatientDetail,
  type PatientListItem,
  type PatientDetail,
} from "@/app/actions/clinical-records";
import type { DoctorOption } from "@/app/actions/appointments";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PatientDetailPane } from "./patient-detail";
import { getInitials, formatDateEs } from "./clinical-utils";

export function ExpedienteView({
  patients,
  initialSelectedId,
  initialDetail,
  doctors,
  isAdmin,
}: {
  patients: PatientListItem[];
  initialSelectedId: string | null;
  initialDetail: PatientDetail | null;
  doctors: DoctorOption[];
  isAdmin: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<PatientDetail | null>(initialDetail);
  const [pending, startTransition] = useTransition();

  const q = query.trim().toLowerCase();
  const filtered = q
    ? patients.filter(
        (p) => p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q),
      )
    : patients;

  function loadPatient(id: string) {
    startTransition(async () => {
      const data = await getPatientDetail(id);
      setDetail(data);
    });
  }

  function selectPatient(id: string) {
    if (id === selectedId) return;
    setSelectedId(id);
    loadPatient(id);
  }

  return (
    <div className="grid grid-cols-1 gap-5 min-[861px]:grid-cols-[260px_1fr] min-[861px]:items-start">
      <Card className="flex max-h-[calc(100dvh-160px)] flex-col gap-1 overflow-y-auto p-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar paciente..."
          className="mb-1.5"
        />
        {filtered.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => selectPatient(p.id)}
            className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors ${
              selectedId === p.id
                ? "bg-[image:var(--gradient-primary)] text-white"
                : "hover:bg-accent"
            }`}
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full font-heading text-xs font-bold text-white ${
                selectedId === p.id ? "bg-white/25" : "bg-[image:var(--gradient-primary)]"
              }`}
            >
              {getInitials(p.full_name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{p.full_name}</span>
              <span
                className={`block truncate text-xs ${
                  selectedId === p.id ? "text-white/80" : "text-muted-foreground"
                }`}
              >
                {p.last_visit ? `Última visita: ${formatDateEs(p.last_visit)}` : "Sin visitas"}
              </span>
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Sin pacientes que coincidan.
          </p>
        )}
      </Card>

      {detail ? (
        <PatientDetailPane
          key={detail.id}
          patient={detail}
          doctors={doctors}
          isAdmin={isAdmin}
          pending={pending}
          onRecordCreated={() => loadPatient(detail.id)}
        />
      ) : (
        <Card className="flex items-center justify-center px-5 py-16 text-sm text-muted-foreground">
          {patients.length === 0
            ? "Todavía no hay pacientes registradas."
            : "Selecciona una paciente para ver su expediente."}
        </Card>
      )}
    </div>
  );
}
