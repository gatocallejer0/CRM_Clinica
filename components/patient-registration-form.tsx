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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FormStagger } from "@/components/ui/field";
import { DatePickerField } from "@/components/ui/date-picker-field";
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

function FieldInput({ field }: { field: FormField }) {
  switch (field.field_type) {
    case "textarea":
      return <Textarea id={field.key} name={field.key} required={field.required} />;
    case "number":
      return (
        <Input id={field.key} name={field.key} type="number" required={field.required} />
      );
    case "date":
      return <DatePickerField id={field.key} name={field.key} required={field.required} />;
    case "select": {
      const activeOptions = field.options.filter((option) => option.active);
      return (
        <Combobox items={activeOptions.map((o) => o.value)} name={field.key} required={field.required}>
          <ComboboxInputGroup>
            <ComboboxInput id={field.key} placeholder="Selecciona una opción" />
            <ComboboxClear />
            <ComboboxTrigger />
          </ComboboxInputGroup>
          <ComboboxPopup>
            <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
            <ComboboxList>
              {(value: string) => (
                <ComboboxItem key={value} value={value}>
                  {value}
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxPopup>
        </Combobox>
      );
    }
    default:
      return <Input id={field.key} name={field.key} type="text" required={field.required} />;
  }
}

function FieldGroup({ field }: { field: FormField }) {
  return (
    <Field label={field.label} htmlFor={field.key} required={field.required}>
      <FieldInput field={field} />
    </Field>
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
      <Card className="relative w-full max-w-lg animate-in fade-in slide-in-from-bottom-2 duration-500">
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
      className="relative flex w-full max-w-lg animate-in flex-col gap-6 fade-in slide-in-from-bottom-2 duration-500"
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
          <FormStagger className="flex flex-col gap-4">
            <Field label="Correo electrónico" htmlFor="email" required>
              <Input id="email" name="email" type="email" required />
            </Field>

            {generalFields.map((field) => (
              <FieldGroup key={field.id} field={field} />
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
            <FormStagger className="flex flex-col gap-4">
              {medicalFields.map((field) => (
                <FieldGroup key={field.id} field={field} />
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
