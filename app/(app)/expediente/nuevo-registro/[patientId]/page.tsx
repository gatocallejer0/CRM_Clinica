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
  const profile = await requireRole(["Admin", "Doctor"]);
  const { patientId } = await params;

  const [patient, doctors] = await Promise.all([getPatientDetail(patientId), listDoctors()]);

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
