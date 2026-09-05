"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updatePatientFicha, type UpdatePatientState } from "@/app/actions/patients";
import type { PatientListItem } from "@/app/actions/clinical-records";
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
import { DatePickerField } from "@/components/ui/date-picker-field";

export function EditPatientDialog({
  open,
  onOpenChange,
  patient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: PatientListItem | null;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<UpdatePatientState, FormData>(
    updatePatientFicha,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success("Paciente actualizado");
      onSaved();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar paciente</DialogTitle>
          <DialogDescription>Actualiza los datos básicos de {patient.full_name}.</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4" key={patient.id}>
          <input type="hidden" name="patientId" value={patient.id} />

          <FormStagger className="flex flex-col gap-4">
            <Field label="Nombre completo" htmlFor="full_name">
              <Input id="full_name" name="full_name" defaultValue={patient.full_name} />
            </Field>

            <FieldRow className="grid-cols-1 min-[480px]:grid-cols-2">
              <Field label="Documento de identificación" htmlFor="national_id">
                <Input id="national_id" name="national_id" defaultValue={patient.national_id ?? ""} />
              </Field>
              <Field label="NIT" htmlFor="nit">
                <Input id="nit" name="nit" defaultValue={patient.nit ?? ""} />
              </Field>
            </FieldRow>

            <FieldRow className="grid-cols-1 min-[480px]:grid-cols-2">
              <Field label="Fecha de nacimiento" htmlFor="birth_date">
                <DatePickerField id="birth_date" name="birth_date" defaultValue={patient.birth_date ?? undefined} />
              </Field>
              <Field label="Edad de paciente" htmlFor="age">
                <Input id="age" name="age" type="number" min="0" defaultValue={patient.age ?? ""} />
              </Field>
            </FieldRow>

            <Field label="Número de teléfono" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={patient.phone ?? ""} />
            </Field>

            <Field label="Contacto de emergencia" htmlFor="emergency_contact">
              <Input
                id="emergency_contact"
                name="emergency_contact"
                defaultValue={patient.emergency_contact ?? ""}
              />
            </Field>
          </FormStagger>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending} loading={pending}>
              Guardar cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
