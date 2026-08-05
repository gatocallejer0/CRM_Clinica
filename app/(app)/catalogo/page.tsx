import { requireRole } from "@/lib/auth/roles";
import { ComingSoon } from "@/components/coming-soon";

export default async function CatalogoPage() {
  await requireRole(["Admin"]);

  return (
    <ComingSoon
      title="Catálogo e inventario"
      description="Próximamente: servicios y productos, con control de stock."
    />
  );
}
