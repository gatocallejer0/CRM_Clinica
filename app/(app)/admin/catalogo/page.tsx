import { requireRole } from "@/lib/auth/roles";
import { listAllServices, listProducts, listSales } from "@/app/actions/catalog";
import { CatalogoView } from "@/components/catalogo/catalogo-view";

export default async function CatalogoPage() {
  // requireRole corre junto a las consultas (no antes de ellas): cada una ya
  // hace su propio requireRole internamente y React cache() comparte esa
  // llamada entre todas, así que no hay round trip duplicado.
  const [, services, products, sales] = await Promise.all([
    requireRole(["Admin"]),
    listAllServices(),
    listProducts(),
    listSales(),
  ]);

  return <CatalogoView services={services} products={products} sales={sales} />;
}
