import { requireRole } from "@/lib/auth/roles";
import { listPatientsForExpediente, getPatientDetail } from "@/app/actions/clinical-records";
import { ExpedienteView } from "@/components/expediente/expediente-view";

export default async function ExpedientePage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  // requireRole corre junto a searchParams y la lista: listPatientsForExpediente
  // ya hace su propio requireRole internamente y React cache() comparte esa
  // llamada. El detalle del paciente sí debe esperar la lista — cuál paciente
  // mostrar depende de ella (dependencia real, no solo de orden del código).
  const [, { patient: requestedId }, patients] = await Promise.all([
    requireRole(["Admin", "Doctor"]),
    searchParams,
    listPatientsForExpediente(),
  ]);
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
