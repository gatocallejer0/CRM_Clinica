import { requireRole } from "@/lib/auth/roles";
import { listRolesWithUsage } from "@/app/actions/roles";
import { RolesView } from "@/components/admin/roles-view";

export default async function RolesPage() {
  // requireRole directo (no requireScreen): esta pantalla nunca es
  // configurable para otros roles — si lo fuera, un rol mal configurado
  // podría escalar sus propios permisos. Admin-only, fijo en código.
  const [, roles] = await Promise.all([requireRole(["Admin"]), listRolesWithUsage()]);

  return <RolesView roles={roles} />;
}
