import { requireRole } from "@/lib/auth/roles";
import { listPatientsForExpediente, getPatientDetail } from "@/app/actions/clinical-records";
import { getFormFieldsWithOptions } from "@/app/actions/form-fields";
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
  const [profile, { patient: requestedId }, patients, formFields] = await Promise.all([
    requireRole(["Admin", "Doctor"]),
    searchParams,
    listPatientsForExpediente(),
    getFormFieldsWithOptions(),
  ]);
  const initialSelectedId =
    requestedId && patients.some((p) => p.id === requestedId) ? requestedId : null;
  const initialDetail = initialSelectedId ? await getPatientDetail(initialSelectedId) : null;

  return (
    <ExpedienteView
      patients={patients}
      initialSelectedId={initialSelectedId}
      initialDetail={initialDetail}
      formFields={formFields.filter((f) => f.active)}
      canAccessCobros={profile.role.name === "Admin"}
    />
  );
}
