"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  IdCardIcon,
  CalendarIcon,
  CakeIcon,
  PhoneIcon,
  SirenIcon,
  ReceiptIcon,
  XIcon,
  SearchIcon,
  UsersIcon,
  PlusIcon,
  PencilIcon,
  QrCodeIcon,
  type LucideIcon,
} from "lucide-react";
import {
  getPatientDetail,
  type PatientListItem,
  type PatientDetail,
} from "@/app/actions/clinical-records";
import type { FormField } from "@/app/actions/form-fields";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { EditPatientDialog } from "./edit-patient-dialog";
import { PatientQrDialog } from "./patient-qr-dialog";
import { PatientRegistrationForm } from "@/components/patient-registration-form";
import { getInitials, formatDateEs } from "./clinical-utils";

const PATIENT_FIELDS: {
  icon: LucideIcon;
  label: string;
  value: (p: PatientDetail) => string;
}[] = [
  { icon: IdCardIcon, label: "Documento de identificación", value: (p) => p.national_id ?? "No registrado" },
  {
    icon: CalendarIcon,
    label: "Fecha de nacimiento",
    value: (p) => (p.birth_date ? formatDateEs(p.birth_date) : "No registrado"),
  },
  { icon: CakeIcon, label: "Edad de paciente", value: (p) => (p.age ? `${p.age} años` : "No registrado") },
  { icon: PhoneIcon, label: "Número de teléfono", value: (p) => p.phone ?? "No registrado" },
  { icon: SirenIcon, label: "Contacto de emergencia", value: (p) => p.emergency_contact ?? "No registrado" },
  { icon: ReceiptIcon, label: "NIT", value: (p) => p.nit ?? "No registrado" },
];

export function ExpedienteView({
  patients,
  initialSelectedId,
  initialDetail,
  formFields,
  canAccessCobros,
}: {
  patients: PatientListItem[];
  initialSelectedId: string | null;
  initialDetail: PatientDetail | null;
  formFields: FormField[];
  canAccessCobros: boolean;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId);
  const [detail, setDetail] = useState<PatientDetail | null>(initialDetail);
  const [editingPatient, setEditingPatient] = useState<PatientListItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  // Bloquea los 3 botones de acción del popup tras el primer clic — sin esto
  // se podían presionar varias veces antes de que la navegación completara.
  const [navigating, setNavigating] = useState(false);
  // Se incrementa en cada apertura de paciente para poder descartar la
  // respuesta de un getPatientDetail() que llegue tarde (ej. si la usuaria
  // cierra el popup y abre otra paciente antes de que la primera consulta
  // resuelva) sin pisar el detalle correcto con uno viejo.
  const detailRequestIdRef = useRef(0);

  const q = query.trim().toLowerCase();
  const filtered = q
    ? patients.filter(
        (p) =>
          p.full_name.toLowerCase().includes(q) ||
          (p.nit ?? "").toLowerCase().includes(q) ||
          (p.phone ?? "").toLowerCase().includes(q),
      )
    : patients;

  function openEdit(p: PatientListItem) {
    setEditingPatient(p);
    setEditOpen(true);
  }

  async function selectPatient(id: string) {
    const requestId = ++detailRequestIdRef.current;
    setSelectedId(id);
    setDetail(null);
    setNavigating(false);
    // Actualiza la URL directo con la History API en vez de router.replace():
    // router.replace() en un segment con searchParams dinámicos vuelve a
    // correr el Server Component entero (re-consulta TODAS las pacientes y
    // sus expedientes) solo para abrir un popup de solo lectura — eso era la
    // causa real de la lentitud al hacer clic en una paciente. El detalle que
    // se muestra ya viene del getPatientDetail() de abajo; la URL solo es
    // para que el enlace sea compartible/recargable.
    window.history.replaceState(null, "", `/expediente?patient=${id}`);
    const data = await getPatientDetail(id);
    if (requestId !== detailRequestIdRef.current) return;
    setDetail(data);
  }

  function closeDetail() {
    detailRequestIdRef.current++;
    setSelectedId(null);
    setDetail(null);
    setNavigating(false);
    window.history.replaceState(null, "", "/expediente");
  }

  function handleActionClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (navigating) {
      e.preventDefault();
      return;
    }
    setNavigating(true);
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <Card className="gap-0 p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <SearchIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre, NIT o teléfono..."
                  className="rounded-full pl-10"
                />
              </div>
              <p className="flex items-center gap-1.5 text-sm whitespace-nowrap text-muted-foreground">
                <UsersIcon className="size-4" />
                {q
                  ? `${filtered.length} de ${patients.length} pacientes`
                  : `${patients.length} paciente${patients.length === 1 ? "" : "s"}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="rounded-full"
                title="Compartir código QR de registro"
                onClick={() => setQrOpen(true)}
              >
                <QrCodeIcon />
              </Button>
              <Button
                type="button"
                className="rounded-full"
                onClick={() => setNewPatientOpen(true)}
              >
                <PlusIcon />
                Nuevo paciente
              </Button>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Paciente</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Última visita</TableHead>
                <TableHead className="pr-5 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow
                  key={p.id}
                  onClick={() => selectPatient(p.id)}
                  className="cursor-pointer"
                >
                  <TableCell className="pl-5">
                    <span className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-neutral)] font-heading text-xs font-bold text-white">
                        {getInitials(p.full_name)}
                      </span>
                      <span className="font-medium text-foreground">{p.full_name}</span>
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <p className="text-foreground">{p.email}</p>
                    {p.phone && <p className="text-xs">{p.phone}</p>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {p.last_visit ? formatDateEs(p.last_visit) : "Sin visitas"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Editar paciente"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(p);
                      }}
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                    {patients.length === 0
                      ? "Todavía no hay pacientes registradas."
                      : "Sin pacientes que coincidan."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      <EditPatientDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        patient={editingPatient}
        onSaved={() => router.refresh()}
      />

      <PatientQrDialog open={qrOpen} onOpenChange={setQrOpen} />

      <Dialog
        open={newPatientOpen}
        onOpenChange={(open) => {
          setNewPatientOpen(open);
          if (!open) router.refresh();
        }}
      >
        <DialogContent
          className="max-h-[90vh] overflow-y-auto p-8"
          style={{ maxWidth: "54rem" }}
        >
          <DialogTitle className="sr-only">Nuevo paciente</DialogTitle>
          <PatientRegistrationForm fields={formFields} wide />
        </DialogContent>
      </Dialog>

      <Dialog open={selectedId !== null} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent
          className="gap-0 overflow-hidden p-0"
          style={{ maxWidth: "42rem", borderRadius: "24px" }}
          showCloseButton={false}
        >
          {detail ? (
            <>
              <div
                className="flex items-start justify-between border-b border-primary/20 bg-primary/10"
                style={{ padding: "24px 32px", gap: "16px" }}
              >
                <div className="flex items-center" style={{ gap: "16px" }}>
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-xl font-bold text-white shadow-sm"
                    style={{ width: "56px", height: "56px" }}
                  >
                    {getInitials(detail.full_name)}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="truncate text-2xl leading-tight font-bold text-foreground">
                      {detail.full_name}
                    </DialogTitle>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{detail.email}</p>
                  </div>
                </div>
                <DialogClose
                  render={<button type="button" aria-label="Cerrar" />}
                  className="shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-white/60 hover:text-foreground"
                  style={{ padding: "8px" }}
                >
                  <XIcon className="size-6" />
                </DialogClose>
              </div>

              <div
                className="grid"
                style={{
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  columnGap: "48px",
                  rowGap: "32px",
                  padding: "32px",
                }}
              >
                {PATIENT_FIELDS.map((f) => (
                  <div key={f.label} className="flex items-start" style={{ gap: "16px" }}>
                    <div
                      className="shrink-0 rounded-xl bg-muted text-muted-foreground"
                      style={{ padding: "10px" }}
                    >
                      <f.icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-sm font-medium text-muted-foreground"
                        style={{ marginBottom: "4px" }}
                      >
                        {f.label}
                      </h3>
                      <p className="truncate text-base font-semibold text-foreground">
                        {f.value(detail)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="flex border-t border-border bg-muted/40"
                style={{ gap: "12px", padding: "20px 32px", borderRadius: "0 0 24px 24px" }}
              >
                <Link
                  href={`/expediente/${detail.id}`}
                  onClick={handleActionClick}
                  aria-disabled={navigating}
                  tabIndex={navigating ? -1 : undefined}
                  className={buttonVariants()}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    borderRadius: "9999px",
                    padding: "10px 16px",
                    height: "auto",
                    ...(navigating ? { pointerEvents: "none", opacity: 0.6 } : {}),
                  }}
                >
                  Expediente Clínico
                </Link>
                <Link
                  href={`/expediente/ficha/${detail.id}`}
                  onClick={handleActionClick}
                  aria-disabled={navigating}
                  tabIndex={navigating ? -1 : undefined}
                  className={buttonVariants({ variant: "secondary" })}
                  style={{
                    flex: 1,
                    justifyContent: "center",
                    borderRadius: "9999px",
                    padding: "10px 16px",
                    height: "auto",
                    ...(navigating ? { pointerEvents: "none", opacity: 0.6 } : {}),
                  }}
                >
                  Ficha de paciente
                </Link>
                {canAccessCobros && (
                  <Link
                    href={`/cobros?patient=${detail.id}`}
                    onClick={handleActionClick}
                    aria-disabled={navigating}
                    tabIndex={navigating ? -1 : undefined}
                    className={buttonVariants({ variant: "outline" })}
                    style={{
                      flex: 1,
                      justifyContent: "center",
                      borderRadius: "9999px",
                      padding: "10px 16px",
                      height: "auto",
                      ...(navigating ? { pointerEvents: "none", opacity: 0.6 } : {}),
                    }}
                  >
                    Cobros y Pagos
                  </Link>
                )}
              </div>
            </>
          ) : (
            <p className="px-8 py-24 text-center text-sm text-muted-foreground">Cargando…</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
