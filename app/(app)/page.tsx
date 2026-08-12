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
import { KpiGrid } from "@/components/dashboard/kpi-grid";

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

      <KpiGrid kpis={kpis} />

      {isAdmin && (
        <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Admin Center</CardTitle>
              <CardDescription>
                Usuarios, formulario de pacientes, catálogo, cobros y reportes.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/admin" className="text-sm font-semibold text-primary hover:underline">
                Ir a Admin Center →
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
    </div>
  );
}
