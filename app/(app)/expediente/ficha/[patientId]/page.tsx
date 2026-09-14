import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { requireScreen } from "@/lib/auth/roles";
import { getPatientFicha } from "@/app/actions/patients";
import { getFormFieldsWithOptions } from "@/app/actions/form-fields";
import { PatientFichaForm } from "@/components/expediente/patient-ficha-form";

export default async function PatientFichaPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = await params;
  const [, ficha, fields] = await Promise.all([
    requireScreen("pacientes"),
    getPatientFicha(patientId),
    getFormFieldsWithOptions(),
  ]);

  if (!ficha) notFound();

  return (
    <div className="flex flex-col gap-4">
      <Link
        href="/expediente"
        className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Volver a pacientes
      </Link>
      <PatientFichaForm
        patientId={patientId}
        email={ficha.email}
        answers={ficha.answers}
        fields={fields.filter((f) => f.active)}
      />
    </div>
  );
}
