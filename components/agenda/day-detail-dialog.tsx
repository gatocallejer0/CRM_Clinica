import type { Appointment } from "@/app/actions/appointments";
import { formatClinicTime } from "@/lib/clinic-time";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";

export function DayDetailDialog({
  open,
  onOpenChange,
  dateLabel,
  appointments,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateLabel: string;
  appointments: Appointment[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{dateLabel}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {appointments.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl border border-white/60 bg-white/40 px-3 py-2.5"
            >
              <div className="w-14 shrink-0 text-sm font-bold text-primary">
                {formatClinicTime(new Date(a.scheduled_at))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {a.patient_name}
                </div>
                <div className="truncate text-xs text-muted-foreground">{a.service_name}</div>
              </div>
              <StatusBadge status={a.status} />
            </div>
          ))}
        </div>

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cerrar</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
