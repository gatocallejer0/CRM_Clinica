import { requireRole } from "@/lib/auth/roles";
import { listAppointments, listServices, listDoctors } from "@/app/actions/appointments";
import { listGoogleReservations } from "@/app/actions/google-calendar";
import { clinicToday, addDays } from "@/lib/clinic-time";
import { AgendaView } from "@/components/agenda/agenda-view";

export default async function AgendaPage() {
  const today = clinicToday();
  const todayISO = today.toISOString();
  const tomorrowISO = addDays(today, 1).toISOString();

  // El chequeo de rol corre en paralelo con las consultas: estas ya dependen
  // únicamente de RLS (no de requireRole) para su seguridad — ver
  // listAppointments/listServices/listDoctors — así que no hay que esperar
  // el rol antes de pedirlas. Ahorra un viaje redondo completo a Supabase.
  const [, appointments, reservations, services, doctors] = await Promise.all([
    requireRole(["Admin", "Doctor", "Recepción"]),
    listAppointments(todayISO, tomorrowISO),
    listGoogleReservations(todayISO, tomorrowISO),
    listServices(),
    listDoctors(),
  ]);

  return (
    <AgendaView
      initialAppointments={appointments}
      initialReservations={reservations}
      services={services}
      doctors={doctors}
    />
  );
}
