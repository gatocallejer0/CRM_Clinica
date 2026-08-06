import { requireRole } from "@/lib/auth/roles";
import { listAppointments, listServices, listDoctors } from "@/app/actions/appointments";
import { clinicToday, addDays } from "@/lib/clinic-time";
import { AgendaView } from "@/components/agenda/agenda-view";

export default async function AgendaPage() {
  await requireRole(["Admin", "Doctor", "Recepción"]);

  const today = clinicToday();
  const [appointments, services, doctors] = await Promise.all([
    listAppointments(today.toISOString(), addDays(today, 1).toISOString()),
    listServices(),
    listDoctors(),
  ]);

  return (
    <AgendaView initialAppointments={appointments} services={services} doctors={doctors} />
  );
}
