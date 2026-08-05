import { requireRole } from "@/lib/auth/roles";
import { ComingSoon } from "@/components/coming-soon";

export default async function ExpedientePage() {
  await requireRole(["Admin", "Doctor", "Recepción"]);

  return (
    <ComingSoon
      title="Expediente clínico"
      description="Próximamente: historial de visitas, recetas y documentos por paciente."
    />
  );
}
