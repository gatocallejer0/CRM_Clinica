import Link from "next/link";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function DashboardPage() {
  const profile = await requireRole(["Admin", "Doctor", "Recepción"]);
  const supabase = await createClient();

  const [{ count: patientsCount }, { count: activeFieldsCount }] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    supabase.from("form_fields").select("*", { count: "exact", head: true }).eq("active", true),
  ]);

  const isAdmin = profile.role.name === "Admin";
  let activeStaffCount: number | null = null;
  if (isAdmin) {
    const { count } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("active", true);
    activeStaffCount = count ?? 0;
  }

  const kpis = [
    { label: "Pacientes registradas", value: patientsCount ?? 0 },
    { label: "Preguntas activas del formulario", value: activeFieldsCount ?? 0 },
    ...(isAdmin ? [{ label: "Personal activo", value: activeStaffCount ?? 0 }] : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground">
          Hola, {profile.full_name} — rol: {profile.role.name}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 min-[861px]:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="px-5">
              <div className="text-xs font-semibold text-muted-foreground">{kpi.label}</div>
              <div className="mt-2 font-heading text-2xl font-bold text-foreground">
                {kpi.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Usuarios</CardTitle>
              <CardDescription>Crea y consulta el acceso del personal.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/usuarios" className="text-sm font-semibold text-primary hover:underline">
                Administrar usuarios →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Formulario de pacientes</CardTitle>
              <CardDescription>Agrega o inactiva preguntas y opciones.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin/formulario" className="text-sm font-semibold text-primary hover:underline">
                Administrar formulario →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Registro de pacientes</CardTitle>
              <CardDescription>Formulario público, sin necesidad de cuenta.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/registro-paciente" className="text-sm font-semibold text-primary hover:underline">
                Ver formulario de registro →
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Próximamente</CardTitle>
          <CardDescription>
            Agenda, expediente clínico, catálogo e inventario, cobros y pagos, y reportes se
            irán habilitando en los próximos módulos del CRM.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
