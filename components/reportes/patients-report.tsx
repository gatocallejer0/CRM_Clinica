"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, CircleCheckIcon, DownloadIcon, UsersIcon } from "lucide-react";
import {
  getPatientsSummaryReport,
  getPatientsDataReport,
  type PatientsSummaryReport,
  type PatientsDataReport,
  type AtRiskPatientRow,
} from "@/app/actions/reports";
import { toClinicDateKey } from "@/lib/clinic-time";
import { exportRowsToCsv } from "@/lib/export-csv";
import { DateRangeFilter } from "./date-range-filter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const DATE_FORMAT = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type Tab = "detalle" | "recurrencia";

const TABS: { value: Tab; label: string }[] = [
  { value: "detalle", label: "Detalle" },
  { value: "recurrencia", label: "Recurrencia" },
];

export function PatientsReportView({
  initialData,
  initialSummary,
  initialAtRisk,
}: {
  initialData: PatientsDataReport;
  initialSummary: PatientsSummaryReport;
  initialAtRisk: AtRiskPatientRow[];
}) {
  const [tab, setTab] = useState<Tab>("detalle");

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

      {tab === "detalle" && <PatientsDetailTab initialData={initialData} />}
      {tab === "recurrencia" && (
        <PatientsRecurrenceTab initialSummary={initialSummary} initialAtRisk={initialAtRisk} />
      )}
    </div>
  );
}

function PatientsDetailTab({ initialData }: { initialData: PatientsDataReport }) {
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<PatientsDataReport>(initialData);
  // Coincide con currentKey para los filtros por defecto de arriba — el
  // servidor ya trajo esos datos, así que no hace falta re-pedirlos al montar.
  const [loadedKey, setLoadedKey] = useState<string | null>(":");
  const isFirstRun = useRef(true);

  const fromKey = range?.from ? toClinicDateKey(range.from) : null;
  const toKey = range?.to ? toClinicDateKey(range.to) : fromKey;
  const currentKey = `${fromKey ?? ""}:${toKey ?? ""}`;
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    let cancelled = false;
    getPatientsDataReport({ fromKey, toKey }).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoadedKey(currentKey);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.rows;
    return data.rows.filter((row) => {
      const name = row.answers["full_name"] ?? "";
      return name.toLowerCase().includes(q) || row.email.toLowerCase().includes(q);
    });
  }, [data, query]);

  const columnCount = 2 + data.fields.length;

  function handleExport() {
    exportRowsToCsv(
      "pacientes-detalle",
      visibleRows.map((row) => ({
        Correo: row.email,
        "Fecha de registro": DATE_FORMAT.format(new Date(row.createdAt)),
        ...Object.fromEntries(data.fields.map((f) => [f.label, row.answers[f.key] ?? ""])),
      })),
    );
  }


  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Todas las respuestas del formulario de registro.</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/70 bg-white/50 p-1.5">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o correo..."
              className="w-56 border-transparent bg-transparent shadow-none hover:border-transparent"
            />
            <DateRangeFilter
              value={range}
              onValueChange={setRange}
              className="border-transparent bg-transparent shadow-none hover:border-transparent"
            />
          </div>
          <Button variant="outline" onClick={handleExport} disabled={visibleRows.length === 0}>
            <DownloadIcon className="size-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Card className="gap-0 p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Correo</TableHead>
              <TableHead>Fecha de registro</TableHead>
              {data.fields.map((f) => <TableHead key={f.key}>{f.label}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              visibleRows.map((row) => (
                <TableRow key={row.patientId}>
                  <TableCell className="pl-5 whitespace-nowrap">{row.email}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {capitalize(DATE_FORMAT.format(new Date(row.createdAt)))}
                  </TableCell>
                  {data.fields.map((f) => (
                    <TableCell key={f.key} className="max-w-56 truncate">
                      {row.answers[f.key] ?? "—"}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {loading && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount} className="py-10 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!loading && visibleRows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columnCount} className="p-0">
                  <EmptyState icon={UsersIcon} message="Sin pacientes que coincidan." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function PatientsRecurrenceTab({
  initialSummary,
  initialAtRisk,
}: {
  initialSummary: PatientsSummaryReport;
  initialAtRisk: AtRiskPatientRow[];
}) {
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [summary, setSummary] = useState<PatientsSummaryReport>(initialSummary);
  // Coincide con currentKey para los filtros por defecto de arriba — el
  // servidor ya trajo esos datos, así que no hace falta re-pedirlos al montar.
  const [summaryLoadedKey, setSummaryLoadedKey] = useState<string | null>(":");
  const isFirstRun = useRef(true);

  // "En riesgo de abandono" no tiene filtros propios — el dato del servidor
  // nunca queda obsoleto dentro de la sesión, así que no hace falta volver a
  // pedirlo del lado del cliente.
  const atRisk = initialAtRisk;

  const fromKey = range?.from ? toClinicDateKey(range.from) : null;
  const toKey = range?.to ? toClinicDateKey(range.to) : fromKey;
  const currentKey = `${fromKey ?? ""}:${toKey ?? ""}`;
  const summaryLoading = summaryLoadedKey !== currentKey;

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    let cancelled = false;
    getPatientsSummaryReport({ fromKey, toKey }).then((result) => {
      if (cancelled) return;
      setSummary(result);
      setSummaryLoadedKey(currentKey);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey]);

  function handleExportMonths() {
    exportRowsToCsv(
      "pacientes-recurrencia",
      summary.months.map((m) => ({
        Mes: m.monthLabel,
        Nuevas: m.nuevas,
        Recurrentes: m.recurrentes,
        Total: m.total,
        "% Recurrencia": `${m.recurrencyPct}%`,
      })),
    );
  }

  function handleExportAtRisk() {
    exportRowsToCsv(
      "pacientes-riesgo-abandono",
      atRisk.map((p) => ({
        Paciente: p.name,
        Correo: p.email,
        "Última visita": DATE_FORMAT.format(new Date(p.lastVisit)),
        "Días sin visitar": p.daysSinceLastVisit,
      })),
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Altas nuevas vs. recurrentes por mes.</p>
          <div className="flex items-center gap-2">
            <DateRangeFilter value={range} onValueChange={setRange} />
            <Button
              variant="outline"
              onClick={handleExportMonths}
              disabled={summary.months.length === 0}
            >
              <DownloadIcon className="size-4" />
              Exportar
            </Button>
          </div>
        </div>

        <Card className="gap-0 p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Mes</TableHead>
                <TableHead>Nuevas</TableHead>
                <TableHead>Recurrentes</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="pr-5 text-right">% Recurrencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!summaryLoading &&
                summary.months.map((m) => (
                  <TableRow key={m.monthKey}>
                    <TableCell className="pl-5 capitalize">{m.monthLabel}</TableCell>
                    <TableCell>{m.nuevas}</TableCell>
                    <TableCell>{m.recurrentes}</TableCell>
                    <TableCell className="font-semibold text-foreground">{m.total}</TableCell>
                    <TableCell className="pr-5 text-right">{m.recurrencyPct}%</TableCell>
                  </TableRow>
                ))}
              {summaryLoading && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    Cargando...
                  </TableCell>
                </TableRow>
              )}
              {!summaryLoading && summary.months.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="p-0">
                    <EmptyState icon={CalendarIcon} message="Sin citas en este rango." />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">Pacientes en riesgo de abandono</p>
            <p className="text-xs text-muted-foreground">
              Sin cita en los últimos 90 días, con al menos una visita previa.
            </p>
          </div>
          <Button variant="outline" onClick={handleExportAtRisk} disabled={atRisk.length === 0}>
            <DownloadIcon className="size-4" />
            Exportar
          </Button>
        </div>

        <Card className="gap-0 p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Paciente</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead className="pr-5 text-right">Días sin visitar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {atRisk.map((p) => (
                <TableRow key={p.patientId}>
                  <TableCell className="pl-5">{p.name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email || "—"}</TableCell>
                  <TableCell>{DATE_FORMAT.format(new Date(p.lastVisit))}</TableCell>
                  <TableCell className="pr-5 text-right font-semibold text-foreground">
                    {p.daysSinceLastVisit}
                  </TableCell>
                </TableRow>
              ))}
              {atRisk.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="p-0">
                    <EmptyState
                      icon={CircleCheckIcon}
                      message="Ninguna paciente en riesgo ahora mismo."
                      tone="positive"
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
