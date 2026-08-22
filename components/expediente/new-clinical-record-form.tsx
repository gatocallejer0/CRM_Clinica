"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";
import {
  createClinicalRecord,
  type CreateClinicalRecordState,
} from "@/app/actions/clinical-records";
import type { DoctorOption } from "@/app/actions/appointments";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldRow, FormStagger } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
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

const WEEK_OPTIONS = Array.from({ length: 42 }, (_, i) => String(i + 1));
const DAY_OPTIONS = Array.from({ length: 7 }, (_, i) => String(i));

export function NewClinicalRecordForm({
  patientId,
  patientName,
  doctors,
  showDoctorSelect,
}: {
  patientId: string;
  patientName: string;
  doctors: DoctorOption[];
  showDoctorSelect: boolean;
}) {
  const router = useRouter();
  const backHref = `/expediente?patient=${patientId}`;
  const [state, action, pending] = useActionState<CreateClinicalRecordState, FormData>(
    createClinicalRecord,
    undefined,
  );
  const doctorNameById = useMemo(() => new Map(doctors.map((d) => [d.id, d.full_name])), [doctors]);
  const [unknownFum, setUnknownFum] = useState(false);

  useEffect(() => {
    if (state?.success) {
      toast.success("Registro clínico guardado");
      router.push(backHref);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <Link
        href={backHref}
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Volver al expediente
      </Link>

      <Card className="p-6">
        <div className="mb-5">
          <h1 className="font-heading text-lg font-semibold text-foreground">Nuevo registro clínico</h1>
          <p className="text-sm text-muted-foreground">
            {patientName} — diagnóstico, notas de evolución y órdenes médicas de esta visita.
          </p>
        </div>

        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="patientId" value={patientId} />

          <FormStagger className="flex flex-col gap-4">
            {showDoctorSelect && (
              <Field label="Doctora" htmlFor="doctorId" className="max-w-sm">
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

            <FieldRow className="grid-cols-1 min-[720px]:grid-cols-2">
              <Field label="Diagnóstico" htmlFor="diagnosis">
                <Textarea id="diagnosis" name="diagnosis" />
              </Field>
              <Field label="Notas de evolución" htmlFor="evolutionNotes">
                <Textarea id="evolutionNotes" name="evolutionNotes" />
              </Field>
            </FieldRow>

            <FieldRow className="grid-cols-1 min-[720px]:grid-cols-2">
              <Field label="Órdenes médicas" htmlFor="medicalOrders">
                <Textarea id="medicalOrders" name="medicalOrders" />
              </Field>
              <Field label="Receta" htmlFor="prescription" hint="Medicamento e indicaciones para la paciente.">
                <Textarea id="prescription" name="prescription" />
              </Field>
            </FieldRow>

            <FieldRow className="grid-cols-1 min-[560px]:grid-cols-3">
              <Field label="Peso (kg)" htmlFor="weightKg">
                <Input id="weightKg" name="weightKg" type="number" step="0.1" min="0" />
              </Field>
              <Field label="Altura (cm)" htmlFor="heightCm">
                <Input id="heightCm" name="heightCm" type="number" step="0.1" min="0" />
              </Field>
              <Field label="FUM" htmlFor="lastMenstrualPeriod">
                <DatePickerField id="lastMenstrualPeriod" name="lastMenstrualPeriod" disabled={unknownFum} />
              </Field>
            </FieldRow>

            <Field>
              <div className="flex items-center gap-2.5 rounded-lg border border-input bg-white/35 px-3.5 py-2.5">
                <Switch checked={unknownFum} onCheckedChange={setUnknownFum} />
                <span className="text-sm text-foreground">La paciente no conoce su FUM</span>
              </div>
            </Field>

            {unknownFum && (
              <Field
                label="Fecha probable de parto"
                htmlFor="estimatedDueDate"
                hint="Indicada directamente, ya que no se conoce la FUM."
                className="max-w-sm"
              >
                <DatePickerField id="estimatedDueDate" name="estimatedDueDate" />
              </Field>
            )}

            <FieldRow className="grid-cols-1 min-[560px]:grid-cols-3">
              <Field label="Fecha de ultrasonido" htmlFor="ultrasoundDate">
                <DatePickerField id="ultrasoundDate" name="ultrasoundDate" />
              </Field>
              <Field label="Semanas (al ultrasonido)" htmlFor="ultrasoundWeeks">
                <Combobox items={WEEK_OPTIONS} name="ultrasoundWeeks">
                  <ComboboxInputGroup>
                    <ComboboxInput id="ultrasoundWeeks" placeholder="Semanas" />
                    <ComboboxClear />
                    <ComboboxTrigger />
                  </ComboboxInputGroup>
                  <ComboboxPopup>
                    <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                    <ComboboxList>
                      {(v: string) => (
                        <ComboboxItem key={v} value={v}>
                          {v}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </Field>
              <Field label="Días (al ultrasonido)" htmlFor="ultrasoundDays">
                <Combobox items={DAY_OPTIONS} name="ultrasoundDays">
                  <ComboboxInputGroup>
                    <ComboboxInput id="ultrasoundDays" placeholder="Días" />
                    <ComboboxClear />
                    <ComboboxTrigger />
                  </ComboboxInputGroup>
                  <ComboboxPopup>
                    <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                    <ComboboxList>
                      {(v: string) => (
                        <ComboboxItem key={v} value={v}>
                          {v}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </Field>
            </FieldRow>
          </FormStagger>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Link href={backHref} className={buttonVariants({ variant: "ghost" })}>
              Cancelar
            </Link>
            <Button type="submit" disabled={pending} loading={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
