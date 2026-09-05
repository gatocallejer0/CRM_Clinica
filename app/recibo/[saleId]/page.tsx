import { notFound } from "next/navigation";
import { getSaleForPrint } from "@/app/actions/catalog";
import { SaleReceiptPrintView } from "@/components/cobros/sale-receipt-print-view";

export default async function ReciboPrintPage({
  params,
}: {
  params: Promise<{ saleId: string }>;
}) {
  const { saleId } = await params;
  const data = await getSaleForPrint(saleId);
  if (!data) notFound();
  return <SaleReceiptPrintView data={data} />;
}
