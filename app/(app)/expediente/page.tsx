import { requireRole } from "@/lib/auth/roles";
import { listPatientsForExpediente, getPatientDetail } from "@/app/actions/clinical-records";
import { ExpedienteView } from "@/components/expediente/expediente-view";

export default async function ExpedientePage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  await requireRole(["Admin", "Doctor"]);
  const { patient: requestedId } = await searchParams;

  const patients = await listPatientsForExpediente();
  const initialSelectedId =
    (requestedId && patients.some((p) => p.id === requestedId) ? requestedId : patients[0]?.id) ?? null;
  const initialDetail = initialSelectedId ? await getPatientDetail(initialSelectedId) : null;

  return (
    <ExpedienteView
      patients={patients}
      initialSelectedId={initialSelectedId}
      initialDetail={initialDetail}
    />
  );
}
