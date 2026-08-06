"use client";

import { useActionState, useEffect } from "react";
import {
  createAppointment,
  type CreateAppointmentState,
  type Service,
  type DoctorOption,
} from "@/app/actions/appointments";
import { PatientSearchField } from "./patient-search-field";
import { STATUS_LABELS } from "./appointment-meta";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function NewAppointmentDialog({
  open,
  onOpenChange,
  services,
  doctors,
  defaultDate,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: Service[];
  doctors: DoctorOption[];
  defaultDate: string;
  onCreated: () => void;
}) {
  const [state, action, pending] = useActionState<CreateAppointmentState, FormData>(
    createAppointment,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      onCreated();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva cita</DialogTitle>
          <DialogDescription>Agenda una cita para una paciente registrada.</DialogDescription>
        </DialogHeader>

        <form action={action} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Paciente</Label>
            <PatientSearchField name="patientId" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="serviceId">Servicio</Label>
            <Select
              name="serviceId"
              required
              items={Object.fromEntries(services.map((s) => [s.id, s.name]))}
            >
              <SelectTrigger id="serviceId" className="w-full">
                <SelectValue placeholder="Selecciona un servicio" />
              </SelectTrigger>
              <SelectContent>
                {services.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="doctorId">Doctora</Label>
            <Select
              name="doctorId"
              required
              items={Object.fromEntries(doctors.map((d) => [d.id, d.full_name]))}
            >
              <SelectTrigger id="doctorId" className="w-full">
                <SelectValue placeholder="Selecciona una doctora" />
              </SelectTrigger>
              <SelectContent>
                {doctors.map((doctor) => (
                  <SelectItem key={doctor.id} value={doctor.id}>
                    {doctor.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" name="date" type="date" defaultValue={defaultDate} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="time">Hora</Label>
              <Input id="time" name="time" type="time" required />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status">Estado</Label>
            <Select name="status" defaultValue="confirmada" items={STATUS_LABELS}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="en_espera">En espera</SelectItem>
                <SelectItem value="atendida">Atendida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input id="notes" name="notes" />
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
