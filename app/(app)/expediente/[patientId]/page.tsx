import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireScreen } from "@/lib/auth/roles";
import { getPatientDetail } from "@/app/actions/clinical-records";
import { PatientDetailPane } from "@/components/expediente/patient-detail";

export default async function PatientExpedientePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const [, patient] = await Promise.all([
    requireScreen("pacientes"),
    getPatientDetail(patientId),
  ]);

  if (!patient) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/expediente"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Volver a pacientes
      </Link>
      <PatientDetailPane patient={patient} pending={false} />
    </div>
  );
}
