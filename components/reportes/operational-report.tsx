"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { CalendarIcon, DownloadIcon } from "lucide-react";
import { getOperationalReport, type OperationalReport } from "@/app/actions/reports";
import { listAllServices, type ServiceRow } from "@/app/actions/catalog";
import type { AppointmentStatus } from "@/app/actions/appointments";
import { STATUS_LABELS, STATUS_STYLE } from "@/components/agenda/appointment-meta";
import { toClinicDateKey } from "@/lib/clinic-time";
import { exportRowsToCsv } from "@/lib/export-csv";
import { DateRangeFilter } from "./date-range-filter";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" });

type StatusFilter = AppointmentStatus | "all";

const STATUS_FILTER_OPTIONS: StatusFilter[] = ["all", "confirmada", "en_espera", "atendida", "cancelada"];
const STATUS_FILTER_LABELS: Record<StatusFilter, string> = { all: "Todos los estados", ...STATUS_LABELS };

export function OperationalReportView() {
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [serviceId, setServiceId] = useState("all");
  const [query, setQuery] = useState("");
  const [services, setServices] = useState<ServiceRow[]>([]);

  const [report, setReport] = useState<OperationalReport | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    listAllServices().then(setServices);
  }, []);

  const fromKey = range?.from ? toClinicDateKey(range.from) : null;
  const toKey = range?.to ? toClinicDateKey(range.to) : fromKey;
  const currentKey = `${fromKey ?? ""}:${toKey ?? ""}:${status}:${serviceId}`;
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let cancelled = false;
    getOperationalReport({
      fromKey,
      toKey,
      status,
      serviceId: serviceId === "all" ? null : serviceId,
    }).then((data) => {
      if (cancelled) return;
      setReport(data);
      setLoadedKey(currentKey);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey, status, serviceId]);

  const visibleRows = useMemo(() => {
    if (!report) return [];
    const q = query.trim().toLowerCase();
    if (!q) return report.rows;
    return report.rows.filter(
      (r) => r.patientName.toLowerCase().includes(q) || r.patientEmail.toLowerCase().includes(q),
    );
  }, [report, query]);

  const total = report ? Object.values(report.summary).reduce((sum, n) => sum + n, 0) : 0;

  const serviceOptions = ["all", ...services.map((s) => s.id)];
  const serviceLabelById: Record<string, string> = {
    all: "Todos los servicios",
    ...Object.fromEntries(services.map((s) => [s.id, s.name])),
  };

  function handleExport() {
    exportRowsToCsv(
      "reporte-operativo",
      visibleRows.map((r) => ({
        Fecha: DATE_TIME_FORMAT.format(new Date(r.scheduledAt)),
        Paciente: r.patientName,
        Correo: r.patientEmail,
        Tipo: r.isNewPatient ? "Nueva" : "Ya registrada",
        Servicio: r.serviceName,
        Estado: STATUS_LABELS[r.status],
      })),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Detalle de citas de la agenda.</p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/70 bg-white/50 p-1.5">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por paciente o correo..."
              className="w-56 border-transparent bg-transparent shadow-none hover:border-transparent"
            />
            <Combobox
              items={serviceOptions}
              value={serviceId}
              onValueChange={(v) => setServiceId(v ?? "all")}
              itemToStringLabel={(v: string) => serviceLabelById[v] ?? v}
            >
              <ComboboxInputGroup className="w-48 border-transparent bg-transparent shadow-none hover:border-transparent">
                <ComboboxInput />
                <ComboboxTrigger />
              </ComboboxInputGroup>
              <ComboboxPopup>
                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                <ComboboxList>
                  {(v: string) => (
                    <ComboboxItem key={v} value={v}>
                      {serviceLabelById[v]}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
            <Combobox
              items={STATUS_FILTER_OPTIONS}
              value={status}
              onValueChange={(v) => setStatus((v ?? "all") as StatusFilter)}
              itemToStringLabel={(v: StatusFilter) => STATUS_FILTER_LABELS[v]}
            >
              <ComboboxInputGroup className="w-44 border-transparent bg-transparent shadow-none hover:border-transparent">
                <ComboboxInput />
                <ComboboxTrigger />
              </ComboboxInputGroup>
              <ComboboxPopup>
                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                <ComboboxList>
                  {(v: StatusFilter) => (
                    <ComboboxItem key={v} value={v}>
                      {STATUS_FILTER_LABELS[v]}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxPopup>
            </Combobox>
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

      {report && (
        <p className="text-sm text-foreground">
          <span className="font-semibold">{total} citas</span>
          {" — "}
          {(Object.entries(report.summary) as [AppointmentStatus, number][]).map(([s, count], i) => (
            <span key={s}>
              {i > 0 && " · "}
              {count} {STATUS_LABELS[s].toLowerCase()}
            </span>
          ))}
        </p>
      )}

      <Card className="gap-0 p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Fecha</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead className="pr-5">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              visibleRows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="pl-5 whitespace-nowrap">
                    {DATE_TIME_FORMAT.format(new Date(r.scheduledAt))}
                  </TableCell>
                  <TableCell>{r.patientName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.patientEmail || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={r.isNewPatient ? "secondary" : "outline"}>
                      {r.isNewPatient ? "Nueva" : "Ya registrada"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.serviceName}</TableCell>
                  <TableCell className="pr-5">
                    <Badge variant="outline" className="border-transparent" style={STATUS_STYLE[r.status]}>
                      {STATUS_LABELS[r.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            {loading && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!loading && visibleRows.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="p-0">
                  <EmptyState icon={CalendarIcon} message="Sin citas que coincidan." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
