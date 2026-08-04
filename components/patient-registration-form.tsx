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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function FieldInput({ field }: { field: FormField }) {
  switch (field.field_type) {
    case "textarea":
      return <Textarea id={field.key} name={field.key} required={field.required} />;
    case "number":
      return (
        <Input id={field.key} name={field.key} type="number" required={field.required} />
      );
    case "date":
      return <Input id={field.key} name={field.key} type="date" required={field.required} />;
    case "select":
      return (
        <Select name={field.key} required={field.required}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecciona una opción" />
          </SelectTrigger>
          <SelectContent>
            {field.options
              .filter((option) => option.active)
              .map((option) => (
                <SelectItem key={option.id} value={option.value}>
                  {option.value}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      );
    default:
      return <Input id={field.key} name={field.key} type="text" required={field.required} />;
  }
}

function FieldGroup({ field }: { field: FormField }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field.key}>{field.label}</Label>
      <FieldInput field={field} />
    </div>
  );
}

export function PatientRegistrationForm({ fields }: { fields: FormField[] }) {
  const [state, action, pending] = useActionState<
    PatientRegistrationState,
    FormData
  >(registerPatient, undefined);

  const generalFields = fields.filter((f) => f.section === "general");
  const medicalFields = fields.filter((f) => f.section === "medical_history");

  if (state?.success) {
    return (
      <Card className="w-full max-w-lg">
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
    <form action={action} className="flex w-full max-w-lg flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Datos generales de paciente</CardTitle>
          <CardDescription>
            Completa tus datos antes de tu cita. Solo el correo es
            obligatorio.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          {generalFields.map((field) => (
            <FieldGroup key={field.id} field={field} />
          ))}
        </CardContent>
      </Card>

      {medicalFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Antecedentes médicos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {medicalFields.map((field) => (
              <FieldGroup key={field.id} field={field} />
            ))}
          </CardContent>
        </Card>
      )}

      {state?.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar registro"}
      </Button>
    </form>
  );
}
