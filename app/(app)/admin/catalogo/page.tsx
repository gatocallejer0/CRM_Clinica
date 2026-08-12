import { requireRole } from "@/lib/auth/roles";
import { listAllServices, listProducts, listSales } from "@/app/actions/catalog";
import { CatalogoView } from "@/components/catalogo/catalogo-view";

export default async function CatalogoPage() {
  await requireRole(["Admin"]);

  const [services, products, sales] = await Promise.all([
    listAllServices(),
    listProducts(),
    listSales(),
  ]);

  return <CatalogoView services={services} products={products} sales={sales} />;
}
