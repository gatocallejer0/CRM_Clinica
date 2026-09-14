import { requireScreen } from "@/lib/auth/roles";
import { listRoles, listUsers } from "@/app/actions/users";
import { UsersView } from "@/components/admin/users-view";

export default async function UsuariosPage() {
  // requireRole corre junto a las consultas: ambas ya hacen su propio
  // requireRole internamente y React cache() comparte esa llamada.
  const [profile, roles, users] = await Promise.all([
    requireScreen("admin.usuarios"),
    listRoles(),
    listUsers(),
  ]);

  return <UsersView users={users} roles={roles} currentUserId={profile.id} />;
}
