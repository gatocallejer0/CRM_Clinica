"use client";

import { useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { DownloadIcon, HistoryIcon } from "lucide-react";
import { getAuditReport, type AuditReportEntry } from "@/app/actions/reports";
import { toClinicDateKey } from "@/lib/clinic-time";
import { exportRowsToCsv } from "@/lib/export-csv";
import { DateRangeFilter } from "./date-range-filter";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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

const ACTION_LABELS: Record<AuditReportEntry["action"], string> = {
  create: "Creación",
  update: "Cambio",
  delete: "Eliminación",
};

const AUDIT_TABLE_LABELS: Record<string, string> = {
  profiles: "Usuarios",
  products: "Productos",
  services: "Servicios",
};

const DATE_TIME_FORMAT = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" });

const TABLE_FILTER_OPTIONS = ["all", ...Object.keys(AUDIT_TABLE_LABELS)];
const TABLE_FILTER_LABELS: Record<string, string> = { all: "Todas las tablas", ...AUDIT_TABLE_LABELS };

export function AuditReportView() {
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [tableFilter, setTableFilter] = useState("all");
  const [entries, setEntries] = useState<AuditReportEntry[] | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const tableName = useMemo(() => (tableFilter === "all" ? null : tableFilter), [tableFilter]);
  const fromKey = range?.from ? toClinicDateKey(range.from) : null;
  const toKey = range?.to ? toClinicDateKey(range.to) : fromKey;
  const currentKey = `${fromKey ?? ""}:${toKey ?? ""}:${tableName ?? "all"}`;
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let cancelled = false;
    getAuditReport({ fromKey, toKey }, tableName).then((data) => {
      if (cancelled) return;
      setEntries(data);
      setLoadedKey(currentKey);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromKey, toKey, tableName]);

  function handleExport() {
    if (!entries) return;
    exportRowsToCsv(
      "reporte-auditoria",
      entries.map((entry) => ({
        "Fecha y hora": DATE_TIME_FORMAT.format(new Date(entry.created_at)),
        Usuario: entry.performed_by_name,
        Acción: ACTION_LABELS[entry.action],
        Módulo: AUDIT_TABLE_LABELS[entry.table_name] ?? entry.table_name,
        Detalle: entry.summary,
      })),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Últimas 200 acciones registradas (Usuarios, Servicios, Productos).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/70 bg-white/50 p-1.5">
            <Combobox
              items={TABLE_FILTER_OPTIONS}
              value={tableFilter}
              onValueChange={(v) => setTableFilter(v ?? "all")}
              itemToStringLabel={(v: string) => TABLE_FILTER_LABELS[v] ?? v}
            >
              <ComboboxInputGroup className="w-44 border-transparent bg-transparent shadow-none hover:border-transparent">
                <ComboboxInput />
                <ComboboxTrigger />
              </ComboboxInputGroup>
              <ComboboxPopup>
                <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                <ComboboxList>
                  {(v: string) => (
                    <ComboboxItem key={v} value={v}>
                      {TABLE_FILTER_LABELS[v] ?? v}
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
          <Button variant="outline" onClick={handleExport} disabled={!entries || entries.length === 0}>
            <DownloadIcon className="size-4" />
            Exportar
          </Button>
        </div>
      </div>

      <Card className="gap-0 p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Fecha y hora</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead className="pr-5">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!loading &&
              entries?.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="pl-5 whitespace-nowrap">
                    {DATE_TIME_FORMAT.format(new Date(entry.created_at))}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{entry.performed_by_name}</TableCell>
                  <TableCell className="whitespace-nowrap text-primary font-medium">
                    {ACTION_LABELS[entry.action]}
                  </TableCell>
                  <TableCell>{AUDIT_TABLE_LABELS[entry.table_name] ?? entry.table_name}</TableCell>
                  <TableCell className="pr-5 max-w-md text-muted-foreground">{entry.summary}</TableCell>
                </TableRow>
              ))}
            {loading && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  Cargando...
                </TableCell>
              </TableRow>
            )}
            {!loading && entries?.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState icon={HistoryIcon} message="Sin actividad en este rango." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
