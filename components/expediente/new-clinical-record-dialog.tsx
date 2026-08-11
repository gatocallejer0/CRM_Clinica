"use client";

import { useActionState, useEffect, useMemo } from "react";
import {
  createClinicalRecord,
  type CreateClinicalRecordState,
} from "@/app/actions/clinical-records";
import type { DoctorOption } from "@/app/actions/appointments";
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
import { Textarea } from "@/components/ui/textarea";
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

export function NewClinicalRecordDialog({
  open,
  onOpenChange,
  patientId,
  doctors,
  showDoctorSelect,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  doctors: DoctorOption[];
  showDoctorSelect: boolean;
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState<CreateClinicalRecordState, FormData>(
    createClinicalRecord,
    undefined,
  );
  const doctorNameById = useMemo(() => new Map(doctors.map((d) => [d.id, d.full_name])), [doctors]);

  useEffect(() => {
    if (state?.success) {
      onOpenChange(false);
      onCreated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuevo registro clínico</DialogTitle>
          <DialogDescription>
            Diagnóstico, notas de evolución y órdenes médicas de esta visita.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="patientId" value={patientId} />

          <FormStagger className="flex flex-col gap-4">
            {showDoctorSelect && (
              <Field label="Doctora" htmlFor="doctorId">
                <Combobox
                  items={doctors.map((d) => d.id)}
                  itemToStringLabel={(id: string) => doctorNameById.get(id) ?? ""}
                  name="doctorId"
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
            )}

            <Field label="Motivo de la consulta" htmlFor="reason">
              <Input id="reason" name="reason" />
            </Field>

            <Field label="Diagnóstico" htmlFor="diagnosis">
              <Textarea id="diagnosis" name="diagnosis" />
            </Field>

            <Field label="Notas de evolución" htmlFor="evolutionNotes">
              <Textarea id="evolutionNotes" name="evolutionNotes" />
            </Field>

            <Field label="Órdenes médicas" htmlFor="medicalOrders">
              <Textarea id="medicalOrders" name="medicalOrders" />
            </Field>

            <FieldRow className="grid-cols-3">
              <Field label="Peso (kg)" htmlFor="weightKg">
                <Input id="weightKg" name="weightKg" type="number" step="0.1" min="0" />
              </Field>
              <Field label="Altura (cm)" htmlFor="heightCm">
                <Input id="heightCm" name="heightCm" type="number" step="0.1" min="0" />
              </Field>
              <Field label="FUM" htmlFor="lastMenstrualPeriod">
                <Input id="lastMenstrualPeriod" name="lastMenstrualPeriod" type="date" />
              </Field>
            </FieldRow>
          </FormStagger>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending} loading={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
