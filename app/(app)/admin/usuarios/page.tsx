import { requireRole } from "@/lib/auth/roles";
import { listRoles, listUsers } from "@/app/actions/users";
import { UsersView } from "@/components/admin/users-view";

export default async function UsuariosPage() {
  const profile = await requireRole(["Admin"]);

  const [roles, users] = await Promise.all([listRoles(), listUsers()]);

  return <UsersView users={users} roles={roles} currentUserId={profile.id} />;
}
