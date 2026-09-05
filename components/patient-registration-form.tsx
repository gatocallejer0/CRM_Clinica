"use client";

import { useActionState } from "react";
import {
  registerPatient,
  type PatientRegistrationState,
} from "@/app/actions/patients";
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

export function PatientRegistrationForm({
  fields,
  wide = false,
}: {
  fields: FormField[];
  /** Diseño ancho de 2 columnas (usado dentro del popup "Nuevo paciente" de Expediente); por defecto, una columna angosta para la página pública. */
  wide?: boolean;
}) {
  const [state, action, pending] = useActionState<
    PatientRegistrationState,
    FormData
  >(registerPatient, undefined);

  const generalFields = fields.filter((f) => f.section === "general");
  const medicalFields = fields.filter((f) => f.section === "medical_history");
  const fieldsClassName = wide ? "grid grid-cols-2 gap-4" : "flex flex-col gap-4";

  if (state?.success) {
    return (
      <Card
        className={`relative w-full animate-in fade-in slide-in-from-bottom-2 duration-500 ${wide ? "" : "max-w-lg"}`}
      >
        <CardHeader>
          <CardTitle>¡Registro completo!</CardTitle>
          <CardDescription>
            Gracias por completar tus datos. La clínica se pondrá en contacto
            contigo antes de tu cita.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <form
      action={action}
      className={`relative flex w-full animate-in flex-col gap-6 fade-in slide-in-from-bottom-2 duration-500 ${wide ? "" : "max-w-lg"}`}
    >
      <Card>
        <CardHeader>
          <CardTitle>Datos generales de paciente</CardTitle>
          <CardDescription>
            Completa tus datos antes de tu cita. Solo el correo es
            obligatorio.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <FormStagger className={fieldsClassName}>
            <Field label="Correo electrónico" htmlFor="email" required>
              <Input id="email" name="email" type="email" required />
            </Field>

            {generalFields.map((field) => (
              <FieldGroup key={field.id} field={field} twoColumn={wide} />
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
            <FormStagger className={fieldsClassName}>
              {medicalFields.map((field) => (
                <FieldGroup key={field.id} field={field} twoColumn={wide} />
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

      <Button type="submit" disabled={pending} loading={pending}>
        {pending ? "Enviando..." : "Enviar registro"}
      </Button>
    </form>
  );
}
