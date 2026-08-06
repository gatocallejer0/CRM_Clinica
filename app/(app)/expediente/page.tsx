import { requireRole } from "@/lib/auth/roles";
import { listPatientsForExpediente, getPatientDetail } from "@/app/actions/clinical-records";
import { listDoctors } from "@/app/actions/appointments";
import { ExpedienteView } from "@/components/expediente/expediente-view";

export default async function ExpedientePage() {
  const profile = await requireRole(["Admin", "Doctor"]);

  const [patients, doctors] = await Promise.all([listPatientsForExpediente(), listDoctors()]);
  const initialSelectedId = patients[0]?.id ?? null;
  const initialDetail = initialSelectedId ? await getPatientDetail(initialSelectedId) : null;

  return (
    <ExpedienteView
      patients={patients}
      initialSelectedId={initialSelectedId}
      initialDetail={initialDetail}
      doctors={doctors}
      isAdmin={profile.role.name === "Admin"}
    />
  );
}
