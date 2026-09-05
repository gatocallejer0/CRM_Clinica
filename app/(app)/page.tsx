import { ExternalLinkIcon } from "lucide-react";
import { requireRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { listAppointments } from "@/app/actions/appointments";
import { getAtRiskPatients } from "@/app/actions/reports";
import { clinicToday, addDays, startOfMonth } from "@/lib/clinic-time";
import { formatCurrency } from "@/lib/format";
import { GENERAL_NAV, ADMIN_NAV } from "@/components/app-shell/nav-config";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { TodaysAgendaCard } from "@/components/dashboard/todays-agenda-card";
import { AtRiskCard } from "@/components/dashboard/at-risk-card";
import { QuickLinksCard } from "@/components/dashboard/quick-links-card";

export default async function DashboardPage() {
  const profile = await requireRole(["Admin", "Doctor", "Recepción"]);
  const supabase = await createClient();

  const isAdmin = profile.role.name === "Admin";
  const canSeeCobros = isAdmin || profile.role.name === "Recepción";

  const today = clinicToday();
  const todayISO = today.toISOString();
  const tomorrowISO = addDays(today, 1).toISOString();
  const monthStartISO = startOfMonth(today).toISOString();

  const [{ count: patientsCount }, appointments] = await Promise.all([
    supabase.from("patients").select("*", { count: "exact", head: true }),
    listAppointments(todayISO, tomorrowISO),
  ]);

  let activeStaffCount = 0;
  let atRiskPatients: Awaited<ReturnType<typeof getAtRiskPatients>> = [];
  if (isAdmin) {
    const [{ count }, atRisk] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("active", true),
      getAtRiskPatients(),
    ]);
    activeStaffCount = count ?? 0;
    atRiskPatients = atRisk;
  }

  let monthRevenue = 0;
  if (canSeeCobros) {
    const { data: monthSales } = await supabase
      .from("sales")
      .select("total")
      .gte("created_at", monthStartISO)
      .eq("status", "pagado");
    monthRevenue = (monthSales ?? []).reduce((sum, s) => sum + s.total, 0);
  }

  const kpis = [
    { label: "Pacientes registradas", value: patientsCount ?? 0 },
    { label: "Citas de hoy", value: appointments.length },
    ...(canSeeCobros ? [{ label: "Cobrado este mes", value: formatCurrency(monthRevenue) }] : []),
    ...(isAdmin ? [{ label: "Personal activo", value: activeStaffCount }] : []),
  ];

  const quickLinks = [...GENERAL_NAV, ...ADMIN_NAV].filter(
    (item) => item.href !== "/" && item.roles.includes(profile.role.name),
  );
  if (isAdmin) {
    quickLinks.push({
      href: "/registro-paciente",
      label: "Registro de pacientes",
      icon: ExternalLinkIcon,
      roles: ["Admin"],
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-muted-foreground">
          Hola, {profile.full_name} — rol: {profile.role.name}
        </p>
      </div>

      <KpiGrid kpis={kpis} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <TodaysAgendaCard appointments={appointments} />
          {isAdmin && <AtRiskCard patients={atRiskPatients.slice(0, 5)} total={atRiskPatients.length} />}
        </div>

        <div className="flex flex-col gap-4">
          <QuickLinksCard items={quickLinks} />
        </div>
      </div>
    </div>
  );
}
