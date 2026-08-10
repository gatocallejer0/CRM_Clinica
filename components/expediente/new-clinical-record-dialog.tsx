"use client";

import { useActionState, useEffect } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

  useEffect(() => {
    if (state?.success) {
      onOpenChange(false);
      onCreated();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

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
                <Select
                  name="doctorId"
                  items={Object.fromEntries(doctors.map((d) => [d.id, d.full_name]))}
                >
                  <SelectTrigger id="doctorId" className="w-full">
                    <SelectValue placeholder="Selecciona una doctora" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
