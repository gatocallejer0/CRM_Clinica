import { requireScreen } from "@/lib/auth/roles";
import { listAllServices, listProducts } from "@/app/actions/catalog";
import { CatalogoView } from "@/components/catalogo/catalogo-view";

export default async function CatalogoPage() {
  // requireRole corre junto a las consultas (no antes de ellas): cada una ya
  // hace su propio requireRole internamente y React cache() comparte esa
  // llamada entre todas, así que no hay round trip duplicado.
  const [, services, products] = await Promise.all([
    requireScreen("admin.catalogo"),
    listAllServices(),
    listProducts(),
  ]);

  return <CatalogoView services={services} products={products} />;
}
