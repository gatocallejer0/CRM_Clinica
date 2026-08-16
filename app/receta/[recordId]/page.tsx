import { notFound } from "next/navigation";
import { getClinicalRecordForPrint } from "@/app/actions/clinical-records";
import { PrescriptionPrintView } from "@/components/expediente/prescription-print-view";

export default async function RecetaPrintPage({
  params,
}: {
  params: Promise<{ recordId: string }>;
}) {
  const { recordId } = await params;
  const data = await getClinicalRecordForPrint(recordId);

  if (!data) notFound();

  return <PrescriptionPrintView data={data} />;
}
