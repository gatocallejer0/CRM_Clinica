"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updatePatientFicha, type UpdatePatientState } from "@/app/actions/patients";
import type { FormField } from "@/app/actions/form-fields";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FormStagger } from "@/components/ui/field";
import { FieldGroup } from "@/components/patient-form-fields";

export function PatientFichaForm({
  patientId,
  email,
  answers,
  fields,
}: {
  patientId: string;
  email: string;
  answers: Record<string, string>;
  fields: FormField[];
}) {
  const [state, action, pending] = useActionState<UpdatePatientState, FormData>(
    updatePatientFicha,
    undefined,
  );

  useEffect(() => {
    if (state?.success) toast.success("Ficha actualizada");
  }, [state]);

  const generalFields = fields.filter((f) => f.section === "general");
  const medicalFields = fields.filter((f) => f.section === "medical_history");

  return (
    <form action={action} className="flex w-full max-w-3xl flex-col gap-6">
      <input type="hidden" name="patientId" value={patientId} />

      <Card>
        <CardHeader>
          <CardTitle>Datos generales de paciente</CardTitle>
          <CardDescription>Ficha completa tal como la llenó la paciente.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormStagger className="grid grid-cols-2 gap-4">
            <Field label="Correo electrónico" htmlFor="email" required>
              <Input id="email" name="email" type="email" defaultValue={email} required />
            </Field>

            {generalFields.map((field) => (
              <FieldGroup key={field.id} field={field} defaultValue={answers[field.key]} twoColumn />
            ))}
          </FormStagger>
        </CardContent>
      </Card>

      {medicalFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Antecedentes médicos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <FormStagger className="grid grid-cols-2 gap-4">
              {medicalFields.map((field) => (
                <FieldGroup key={field.id} field={field} defaultValue={answers[field.key]} twoColumn />
              ))}
            </FormStagger>
          </CardContent>
        </Card>
      )}

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending} loading={pending} className="w-fit">
        {pending ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
