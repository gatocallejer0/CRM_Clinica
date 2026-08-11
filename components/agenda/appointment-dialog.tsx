"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { TriangleAlertIcon } from "lucide-react";
import {
  createAppointment,
  updateAppointment,
  type AppointmentFormState,
  type Appointment,
  type Service,
  type DoctorOption,
} from "@/app/actions/appointments";
import { PatientSearchField } from "./patient-search-field";
import { AppointmentDateTimeFields } from "./appointment-date-time-fields";
import { STATUS_LABELS } from "./appointment-meta";
import { toClinicDateKey, toClinicTimeKey } from "@/lib/clinic-time";
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

const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90];
const DURATION_LABELS: Record<string, string> = {
  "15": "15 min",
  "20": "20 min",
  "30": "30 min",
  "45": "45 min",
  "60": "1 hora",
  "90": "1 hora 30 min",
};

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  services,
  doctors,
  defaultDate,
  defaultTime,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si viene definida, el diálogo edita esta cita; si no, crea una nueva. */
  appointment?: Appointment;
  services: Service[];
  doctors: DoctorOption[];
  defaultDate?: string;
  defaultTime?: string;
  onSaved: () => void;
}) {
  const isEdit = !!appointment;
  const action = isEdit ? updateAppointment : createAppointment;
  const [state, formAction, pending] = useActionState<AppointmentFormState, FormData>(
    action,
    undefined,
  );

  const serviceNameById = useMemo(() => new Map(services.map((s) => [s.id, s.name])), [services]);
  const doctorNameById = useMemo(() => new Map(doctors.map((d) => [d.id, d.full_name])), [doctors]);

  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");
  const [serviceId, setServiceId] = useState(appointment?.service_id ?? "");
  const [duration, setDuration] = useState(String(appointment?.duration_minutes ?? 30));
  // Al editar, la duración guardada ya es un valor real elegido antes — no se
  // debe pisar solo porque se cambió el servicio. Al crear, el primer
  // servicio elegido sí sugiere su duración por defecto (conveniente), pero
  // deja de tocarla en cuanto la usuaria la ajusta a mano.
  const [durationTouched, setDurationTouched] = useState(isEdit);
  const [overlapDismissed, setOverlapDismissed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const forceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.success) {
      onSaved();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function handleConfirmOverlap() {
    if (forceInputRef.current) forceInputRef.current.value = "true";
    formRef.current?.requestSubmit();
  }

  function handleServiceChange(value: string | null) {
    setServiceId(value ?? "");
    if (durationTouched) return;
    const service = services.find((s) => s.id === value);
    if (service) setDuration(String(service.duration_minutes));
  }

  const scheduledAt = appointment ? new Date(appointment.scheduled_at) : null;
  const initialDate = scheduledAt ? toClinicDateKey(scheduledAt) : defaultDate;
  const initialTime = scheduledAt ? toClinicTimeKey(scheduledAt) : defaultTime;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cita" : "Nueva cita"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cambia el estado, la fecha/hora o reasigna la cita."
              : "Agenda una cita — la paciente puede registrarse el día de su consulta."}
          </DialogDescription>
        </DialogHeader>

        <form
          ref={formRef}
          action={formAction}
          onSubmit={() => setOverlapDismissed(false)}
          className="flex flex-col gap-4"
          key={appointment?.id ?? "create"}
        >
          {isEdit && <input type="hidden" name="id" value={appointment.id} />}
          <input ref={forceInputRef} type="hidden" name="force" defaultValue="false" />

          <FormStagger className="flex flex-col gap-4">
            {isEdit ? (
              <Field label="Paciente">
                <div className="flex h-10 items-center rounded-lg border border-input bg-muted/40 px-3.5 text-sm text-foreground">
                  {appointment.patient_name}
                </div>
              </Field>
            ) : (
              <>
                <input type="hidden" name="patientMode" value={patientMode} />
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
              </>
            )}

            <FieldRow>
              <Field label="Servicio" htmlFor="serviceId" required>
                <Combobox
                  items={services.map((s) => s.id)}
                  value={serviceId || null}
                  onValueChange={(v) => handleServiceChange(v)}
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

              <Field label="Duración" htmlFor="durationMinutes" required>
                <Combobox
                  items={DURATION_OPTIONS.map(String)}
                  value={duration}
                  onValueChange={(v) => {
                    setDuration(v ?? "30");
                    setDurationTouched(true);
                  }}
                  itemToStringLabel={(v: string) => DURATION_LABELS[v] ?? v}
                  name="durationMinutes"
                  required
                >
                  <ComboboxInputGroup>
                    <ComboboxInput id="durationMinutes" />
                    <ComboboxTrigger />
                  </ComboboxInputGroup>
                  <ComboboxPopup>
                    <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                    <ComboboxList>
                      {(v: string) => (
                        <ComboboxItem key={v} value={v}>
                          {DURATION_LABELS[v]}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </Field>
            </FieldRow>

            <Field label="Doctora" htmlFor="doctorId" required>
              <Combobox
                items={doctors.map((d) => d.id)}
                defaultValue={appointment?.doctor_id ?? null}
                itemToStringLabel={(id: string) => doctorNameById.get(id) ?? ""}
                name="doctorId"
                required
              >
                <ComboboxInputGroup>
                  <ComboboxInput id="doctorId" placeholder="Busca una doctora..." />
                  <ComboboxClear />
                  <ComboboxTrigger />
                </ComboboxInputGroup>
                <ComboboxPopup>
                  <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                  <ComboboxList>
                    {(id: string) => (
                      <ComboboxItem key={id} value={id}>
                        {doctorNameById.get(id)}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
            </Field>

            <AppointmentDateTimeFields defaultDate={initialDate} defaultTime={initialTime} />

            <Field label="Estado" htmlFor="status">
              <Combobox
                items={Object.keys(STATUS_LABELS)}
                defaultValue={appointment?.status ?? "confirmada"}
                itemToStringLabel={(v: string) => STATUS_LABELS[v as keyof typeof STATUS_LABELS] ?? v}
                name="status"
              >
                <ComboboxInputGroup>
                  <ComboboxInput id="status" />
                  <ComboboxTrigger />
                </ComboboxInputGroup>
                <ComboboxPopup>
                  <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                  <ComboboxList>
                    {(v: string) => (
                      <ComboboxItem key={v} value={v}>
                        {STATUS_LABELS[v as keyof typeof STATUS_LABELS]}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
            </Field>

            <Field label="Notas" htmlFor="notes" hint="Opcional">
              <Input id="notes" name="notes" defaultValue={appointment?.notes ?? ""} />
            </Field>
          </FormStagger>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state?.overlap && state.overlap.length > 0 && !overlapDismissed && (
            <Alert className="border-amber-300/70 bg-amber-50 text-amber-900">
              <TriangleAlertIcon className="text-amber-600" />
              <AlertDescription className="text-amber-900/90">
                <p className="font-medium text-amber-900">Ya hay una cita en ese horario:</p>
                <ul className="mt-1 list-disc pl-4">
                  {state.overlap.map((c, i) => (
                    <li key={i}>
                      {c.timeLabel} — {c.patientName}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setOverlapDismissed(true)}
                  >
                    Elegir otro horario
                  </Button>
                  <Button type="button" size="sm" onClick={handleConfirmOverlap}>
                    Confirmar de todas formas
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending} loading={pending}>
              {pending ? "Guardando..." : isEdit ? "Guardar cambios" : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
