import { requireRole } from "@/lib/auth/roles";
import { listAppointments, listServices, listDoctors } from "@/app/actions/appointments";
import { clinicToday, addDays } from "@/lib/clinic-time";
import { AgendaView } from "@/components/agenda/agenda-view";

export default async function AgendaPage() {
  const today = clinicToday();

  // El chequeo de rol corre en paralelo con las consultas: estas ya dependen
  // únicamente de RLS (no de requireRole) para su seguridad — ver
  // listAppointments/listServices/listDoctors — así que no hay que esperar
  // el rol antes de pedirlas. Ahorra un viaje redondo completo a Supabase.
  const [, appointments, services, doctors] = await Promise.all([
    requireRole(["Admin", "Doctor", "Recepción"]),
    listAppointments(today.toISOString(), addDays(today, 1).toISOString()),
    listServices(),
    listDoctors(),
  ]);

  return (
    <AgendaView initialAppointments={appointments} services={services} doctors={doctors} />
  );
}
