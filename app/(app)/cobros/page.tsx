import { requireRole } from "@/lib/auth/roles";
import { ComingSoon } from "@/components/coming-soon";

export default async function CobrosPage() {
  await requireRole(["Admin"]);

  return (
    <ComingSoon
      title="Cobros y pagos"
      description="Próximamente: registro de cobros por paciente, método de pago y estado."
    />
  );
}
