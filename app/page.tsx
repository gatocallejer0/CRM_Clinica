import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { requireRole } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";

export default async function DashboardPage() {
  // Any signed-in, active user with a known role can see the dashboard.
  const profile = await requireRole(["Admin", "Doctor", "Recepción"]);

  return (
    <div className="flex flex-1 flex-col gap-6 p-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">CRM Clínica</h1>
          <p className="text-muted-foreground">
            Hola, {profile.full_name} — rol: {profile.role.name}
          </p>
        </div>
        <form action={logout}>
          <Button variant="outline" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </header>

      <p className="text-muted-foreground">
        Próximamente: pacientes, agendamiento y más módulos del CRM.
      </p>

      {profile.role.name === "Admin" && (
        <div className="flex flex-col gap-2">
          <Link
            href="/admin/usuarios"
            className="text-sm font-medium underline underline-offset-4"
          >
            Administrar usuarios →
          </Link>
          <Link
            href="/admin/formulario"
            className="text-sm font-medium underline underline-offset-4"
          >
            Administrar formulario de pacientes →
          </Link>
        </div>
      )}
    </div>
  );
}
