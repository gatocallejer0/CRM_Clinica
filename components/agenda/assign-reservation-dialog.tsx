"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  assignPatientToGoogleReservation,
  type AssignReservationFormState,
  type Service,
} from "@/app/actions/appointments";
import type { GoogleReservation } from "@/app/actions/google-calendar";
import { PatientSearchField } from "./patient-search-field";
import { formatClinicDateLong, formatClinicTime } from "@/lib/clinic-time";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldRow, FormStagger } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxClear,
  ComboboxTrigger,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";

export function AssignReservationDialog({
  open,
  onOpenChange,
  reservation,
  services,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: GoogleReservation;
  services: Service[];
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<AssignReservationFormState, FormData>(
    assignPatientToGoogleReservation,
    undefined,
  );

  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [serviceId, setServiceId] = useState("");
  const serviceNameById = useMemo(() => new Map(services.map((s) => [s.id, s.name])), [services]);

  useEffect(() => {
    if (state?.success) {
      toast.success("Cita asignada");
      onSaved();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const start = new Date(reservation.startISO);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar reserva de Google Calendar</DialogTitle>
          <DialogDescription>
            Este horario ya está bloqueado en el Google Calendar de {reservation.doctorName} — asigna
            paciente y servicio para convertirlo en cita del CRM.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4" key={reservation.googleEventId}>
          <input type="hidden" name="googleEventId" value={reservation.googleEventId} />
          <input type="hidden" name="doctorId" value={reservation.doctorId} />
          <input type="hidden" name="startISO" value={reservation.startISO} />
          <input type="hidden" name="endISO" value={reservation.endISO} />
          <input type="hidden" name="patientMode" value={patientMode} />

          <FormStagger className="flex flex-col gap-4">
            <FieldRow>
              <Field label="Doctora">
                <div className="flex h-10 items-center rounded-lg border border-input bg-muted/40 px-3.5 text-sm text-foreground">
                  {reservation.doctorName}
                </div>
              </Field>
              <Field label="Fecha y hora">
                <div className="flex h-10 items-center rounded-lg border border-input bg-muted/40 px-3.5 text-sm text-foreground capitalize">
                  {formatClinicDateLong(start)} · {formatClinicTime(start)}
                </div>
              </Field>
            </FieldRow>

            <Field label="Paciente" required>
              <div className="flex gap-1 rounded-lg border border-input bg-white/35 p-1">
                <button
                  type="button"
                  onClick={() => setPatientMode("existing")}
                  className={`flex-1 rounded-[7px] py-1.5 text-xs font-semibold transition-colors ${
                    patientMode === "existing"
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Ya registrada
                </button>
                <button
                  type="button"
                  onClick={() => setPatientMode("new")}
                  className={`flex-1 rounded-[7px] py-1.5 text-xs font-semibold transition-colors ${
                    patientMode === "new"
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent"
                  }`}
                >
                  Nueva paciente
                </button>
              </div>
            </Field>

            {patientMode === "existing" ? (
              <Field>
                <PatientSearchField name="patientId" />
              </Field>
            ) : (
              <FieldRow>
                <Field label="Nombre completo" htmlFor="newPatientName" required>
                  <Input id="newPatientName" name="newPatientName" required />
                </Field>
                <Field label="Correo electrónico" htmlFor="newPatientEmail" required>
                  <Input id="newPatientEmail" name="newPatientEmail" type="email" required />
                </Field>
              </FieldRow>
            )}

            <Field label="Servicio" htmlFor="serviceId" required>
              <Combobox
                items={services.map((s) => s.id)}
                value={serviceId || null}
                onValueChange={(v) => setServiceId(v ?? "")}
                itemToStringLabel={(id: string) => serviceNameById.get(id) ?? ""}
                name="serviceId"
                required
              >
                <ComboboxInputGroup>
                  <ComboboxInput id="serviceId" placeholder="Busca un servicio..." />
                  <ComboboxClear />
                  <ComboboxTrigger />
                </ComboboxInputGroup>
                <ComboboxPopup>
                  <ComboboxEmpty>Sin servicios que coincidan.</ComboboxEmpty>
                  <ComboboxList>
                    {(id: string) => (
                      <ComboboxItem key={id} value={id}>
                        {serviceNameById.get(id)}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
            </Field>

            <Field label="Notas" htmlFor="notes" hint="Opcional">
              <Input id="notes" name="notes" />
            </Field>
          </FormStagger>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending} loading={pending}>
              {pending ? "Guardando..." : "Asignar y crear cita"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
