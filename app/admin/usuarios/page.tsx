import { requireRole } from "@/lib/auth/roles";
import { listRoles, listUsers } from "@/app/actions/users";
import { CreateUserForm } from "@/components/create-user-form";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function UsuariosPage() {
  await requireRole(["Admin"]);

  const [roles, users] = await Promise.all([listRoles(), listUsers()]);

  return (
    <div className="flex flex-1 flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-muted-foreground">
          Crea y consulta el acceso del personal de la clínica.
        </p>
      </div>

      <CreateUserForm roles={roles} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Correo</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.full_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <Badge variant="secondary">{user.role?.name ?? "—"}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={user.active ? "default" : "outline"}>
                  {user.active ? "Activo" : "Inactivo"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
