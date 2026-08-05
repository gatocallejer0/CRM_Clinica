import { requireRole } from "@/lib/auth/roles";
import { ComingSoon } from "@/components/coming-soon";

export default async function AgendaPage() {
  await requireRole(["Admin", "Doctor", "Recepción"]);

  return (
    <ComingSoon
      title="Agenda"
      description="Próximamente: citas por día, semana y mes."
    />
  );
}
