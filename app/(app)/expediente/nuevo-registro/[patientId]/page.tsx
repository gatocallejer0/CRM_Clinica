import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth/roles";
import { getPatientDetail } from "@/app/actions/clinical-records";
import { listDoctors } from "@/app/actions/appointments";
import { NewClinicalRecordForm } from "@/components/expediente/new-clinical-record-form";

export default async function NuevoRegistroClinicoPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  // params se resuelve casi al instante (no es una consulta de red), así que
  // se espera antes para tener patientId; requireRole corre junto a las
  // consultas — getPatientDetail ya hace su propio requireRole internamente
  // y React cache() comparte esa llamada.
  const { patientId } = await params;
  const [profile, patient, doctors] = await Promise.all([
    requireRole(["Admin", "Doctor"]),
    getPatientDetail(patientId),
    listDoctors(),
  ]);

  if (!patient) notFound();

  return (
    <NewClinicalRecordForm
      patientId={patient.id}
      patientName={patient.full_name}
      doctors={doctors}
      showDoctorSelect={profile.role.name === "Admin"}
    />
  );
}
