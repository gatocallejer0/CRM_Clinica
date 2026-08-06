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
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
            Diagnóstico, notas de evolución, órdenes y receta de esta visita.
          </DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-3">
          <input type="hidden" name="patientId" value={patientId} />

          {showDoctorSelect && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="doctorId">Doctora</Label>
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
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Motivo de la consulta</Label>
            <Input id="reason" name="reason" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="diagnosis">Diagnóstico</Label>
            <Textarea id="diagnosis" name="diagnosis" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="evolutionNotes">Notas de evolución</Label>
            <Textarea id="evolutionNotes" name="evolutionNotes" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="medicalOrders">Órdenes médicas</Label>
            <Textarea id="medicalOrders" name="medicalOrders" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="medication">Medicamento</Label>
              <Input id="medication" name="medication" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="medicationInstructions">Indicaciones</Label>
              <Input id="medicationInstructions" name="medicationInstructions" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="weightKg">Peso (kg)</Label>
              <Input id="weightKg" name="weightKg" type="number" step="0.1" min="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="heightCm">Altura (cm)</Label>
              <Input id="heightCm" name="heightCm" type="number" step="0.1" min="0" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastMenstrualPeriod">FUM</Label>
              <Input id="lastMenstrualPeriod" name="lastMenstrualPeriod" type="date" />
            </div>
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="ghost" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
