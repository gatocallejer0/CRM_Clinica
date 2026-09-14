import { requireScreen } from "@/lib/auth/roles";
import { listProducts, listAllServices, listSales, getPatientOption } from "@/app/actions/catalog";
import { CobrosView } from "@/components/cobros/cobros-view";

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{ patient?: string }>;
}) {
  const [, { patient: patientId }, products, services, sales] = await Promise.all([
    requireScreen("cobros"),
    searchParams,
    listProducts(),
    listAllServices(),
    listSales(),
  ]);

  const initialPatient = patientId ? (await getPatientOption(patientId)) ?? undefined : undefined;

  return (
    <CobrosView
      sales={sales}
      products={products}
      services={services}
      initialPatient={initialPatient}
    />
  );
}
