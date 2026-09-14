"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DateRange } from "react-day-picker";
import {
  ChartColumnIcon,
  PackageIcon,
  PlusIcon,
  PrinterIcon,
  ReceiptIcon,
  SearchIcon,
  StethoscopeIcon,
  XIcon,
} from "lucide-react";
import type { SaleRow, ProductRow, ServiceRow } from "@/app/actions/catalog";
import type { PatientOption } from "@/app/actions/appointments";
import { toClinicDateKey, normalizeSpaces } from "@/lib/clinic-time";
import { DateRangeFilter } from "@/components/reportes/date-range-filter";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { SaleDialog } from "./sale-dialog";
import { SaleDetailDialog } from "./sale-detail-dialog";
import { SalesMetricsDialog } from "./sales-metrics-dialog";
import { SaleStatusBadge } from "./sale-status-badge";
import { formatCurrency } from "@/lib/format";

const DATE_FORMAT = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" });

type ItemFilter = "todos" | "product" | "service";

const ITEM_FILTERS: { value: ItemFilter; label: string; icon: typeof PackageIcon }[] = [
  { value: "todos", label: "Todos", icon: ReceiptIcon },
  { value: "product", label: "Productos", icon: PackageIcon },
  { value: "service", label: "Servicios", icon: StethoscopeIcon },
];

export function CobrosView({
  sales,
  products,
  services,
  initialPatient,
}: {
  sales: SaleRow[];
  products: ProductRow[];
  services: ServiceRow[];
  initialPatient?: PatientOption;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [patientFilterId, setPatientFilterId] = useState<string | null>(initialPatient?.id ?? null);
  const [itemFilter, setItemFilter] = useState<ItemFilter>("todos");
  const [saleDialogOpen, setSaleDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);
  const [metricsOpen, setMetricsOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>(undefined);

  const q = query.trim().toLowerCase();
  const fromKey = range?.from ? toClinicDateKey(range.from) : null;
  const toKey = range?.to ? toClinicDateKey(range.to) : fromKey;
  const filtered = useMemo(() => {
    return sales.filter((s) => {
      if (patientFilterId && s.patient_id !== patientFilterId) return false;
      if (itemFilter !== "todos" && !s.items.some((i) => i.kind === itemFilter)) return false;
      if (fromKey || toKey) {
        const saleKey = toClinicDateKey(new Date(s.created_at));
        if (fromKey && saleKey < fromKey) return false;
        if (toKey && saleKey > toKey) return false;
      }
      if (!q) return true;
      return (s.patient_name ?? "").toLowerCase().includes(q) || s.sold_by_name.toLowerCase().includes(q);
    });
  }, [sales, patientFilterId, itemFilter, fromKey, toKey, q]);

  const total = filtered.reduce((sum, s) => sum + s.total, 0);

  function refresh() {
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <Card className="gap-0 p-0">
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por paciente o vendedor..."
                className="rounded-full pl-10"
              />
            </div>
            <p className="flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground">
              <ReceiptIcon className="size-4" />
              {patientFilterId ? `Total de ${initialPatient?.full_name ?? "esta paciente"}:` : "Total mostrado:"}{" "}
              <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <DateRangeFilter value={range} onValueChange={setRange} className="rounded-full" />
              <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/70 bg-white/50 p-1">
                {ITEM_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setItemFilter(f.value)}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                      itemFilter === f.value
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    <f.icon className="size-3.5" />
                    {f.label}
                  </button>
                ))}
              </div>
              {patientFilterId && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setPatientFilterId(null)}
                >
                  <XIcon className="size-3.5" />
                  Ver todas las ventas
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => setMetricsOpen(true)}
              >
                <ChartColumnIcon />
                Métricas
              </Button>
              <Button type="button" className="rounded-full" onClick={() => setSaleDialogOpen(true)}>
                <PlusIcon />
                Nueva venta
              </Button>
            </div>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Fecha</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Productos / servicios</TableHead>
              <TableHead>Vendido por</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="pr-5 text-right">Recibo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((sale) => (
              <TableRow
                key={sale.id}
                className="cursor-pointer hover:bg-muted/40"
                onClick={() => setSelectedSale(sale)}
              >
                <TableCell className="pl-5 whitespace-nowrap">
                  {normalizeSpaces(DATE_FORMAT.format(new Date(sale.created_at)))}
                </TableCell>
                <TableCell>{sale.patient_name ?? "—"}</TableCell>
                <TableCell className="max-w-xs">
                  <span className="text-sm text-muted-foreground">
                    {sale.items.map((i) => `${i.quantity} ${i.product_name}`).join(", ")}
                  </span>
                </TableCell>
                <TableCell>{sale.sold_by_name}</TableCell>
                <TableCell className="font-semibold text-foreground">
                  {formatCurrency(sale.total)}
                </TableCell>
                <TableCell>
                  <SaleStatusBadge status={sale.status} />
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <Link
                    href={`/recibo/${sale.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    title="Imprimir recibo"
                  >
                    <PrinterIcon className="size-4" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="p-0">
                  <EmptyState icon={ReceiptIcon} message="Sin ventas todavía." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <SaleDialog
        open={saleDialogOpen}
        onOpenChange={setSaleDialogOpen}
        products={products}
        services={services}
        initialPatient={patientFilterId ? initialPatient : undefined}
        onSaved={refresh}
      />

      <SaleDetailDialog
        key={selectedSale?.id}
        sale={selectedSale}
        open={selectedSale !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedSale(null);
        }}
        onSaved={refresh}
      />

      <SalesMetricsDialog sales={filtered} open={metricsOpen} onOpenChange={setMetricsOpen} />
    </div>
  );
}
