import { requireRole } from "@/lib/auth/roles";
import { ComingSoon } from "@/components/coming-soon";

export default async function ReportesPage() {
  await requireRole(["Admin"]);

  return (
    <ComingSoon
      title="Reportes"
      description="Próximamente: reportes financiero, operativo, de pacientes y auditoría."
    />
  );
}
