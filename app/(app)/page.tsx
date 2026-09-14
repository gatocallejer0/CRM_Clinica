import { UsersIcon, CalendarDaysIcon, WalletIcon } from "lucide-react";
import { requireScreen } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { listAppointments } from "@/app/actions/appointments";
import { getAtRiskPatients } from "@/app/actions/reports";
import {
  clinicToday,
  addDays,
  addMonths,
  startOfMonth,
  clinicDayOfMonth,
  isSameClinicDay,
  nowMs,
} from "@/lib/clinic-time";
import { formatCurrency } from "@/lib/format";
import { KpiCard, type Kpi } from "@/components/dashboard/kpi-card";
import { AppointmentsTodayCard } from "@/components/dashboard/appointments-today-card";
import { AtRiskCard } from "@/components/dashboard/at-risk-card";
import { AttendedAreaChart } from "@/components/dashboard/charts/attended-area-chart";
import { ServiceTypeBarChart } from "@/components/dashboard/charts/service-type-bar-chart";
import { TopProductsDonutChart } from "@/components/dashboard/charts/top-products-donut-chart";
import { AttendanceDonutChart } from "@/components/dashboard/charts/attendance-donut-chart";
import { MonthlyBarChartCard } from "@/components/dashboard/charts/monthly-bar-chart-card";
import {
  bucketDailyAttended,
  bucketMonthlyRevenue,
  bucketMonthlyAppointments,
  bucketAttendanceCounts,
  bucketServiceCounts,
  bucketTopProducts,
  type ProductShare,
  type MonthPoint,
} from "@/components/dashboard/dashboard-metrics";

export default async function DashboardPage() {
  const profile = await requireScreen("dashboard");
  const supabase = await createClient();

  const isAdmin = profile.role.name === "Admin";
  const canSeeCobros = isAdmin || profile.role.name === "Recepción";

  const today = clinicToday();
  const tomorrowISO = addDays(today, 1).toISOString();
  const monthStartISO = startOfMonth(today).toISOString();
  const sixMonthsAgoISO = startOfMonth(addMonths(today, -5)).toISOString();
  const prevMonthStart = startOfMonth(addMonths(today, -1));
  const prevMonthStartISO = prevMonthStart.toISOString();
  // Mismo número de días transcurridos que en el mes actual, no el mes anterior
  // completo — comparar un mes parcial contra uno completo exageraría cualquier
  // caída durante las primeras semanas de cada mes.
  const prevMonthEquivalentEndISO = addDays(prevMonthStart, clinicDayOfMonth(today)).toISOString();

  // Cada tarjeta del Dashboard resuelve su propio dato de forma independiente
  // (allSettled, no all): que una consulta falle no debe dejar en blanco toda
  // la pantalla, solo la tarjeta afectada muestra un aviso.
  const [patientsCountSettled, patientsThisMonthSettled, monthAppointmentsSettled, sixMonthAppointmentsSettled] =
    await Promise.allSettled([
      supabase.from("patients").select("*", { count: "exact", head: true }),
      supabase.from("patients").select("*", { count: "exact", head: true }).gte("created_at", monthStartISO),
      // Trae todo el mes en curso (incluye "hoy") — alimenta la tarjeta de
      // citas de hoy y las 3 gráficas de citas del mes.
      listAppointments(monthStartISO, tomorrowISO),
      supabase
        .from("appointments")
        .select("scheduled_at, status")
        .gte("scheduled_at", sixMonthsAgoISO)
        .lt("scheduled_at", tomorrowISO),
    ]);

  const patientsCount =
    patientsCountSettled.status === "fulfilled" && !patientsCountSettled.value.error
      ? patientsCountSettled.value.count
      : null;
  const patientsCountError = !(patientsCountSettled.status === "fulfilled" && !patientsCountSettled.value.error);

  // Si esta consulta falla, solo se pierde el "+N este mes" del hint — no
  // amerita su propio estado de error visible.
  const patientsThisMonth =
    patientsThisMonthSettled.status === "fulfilled" && !patientsThisMonthSettled.value.error
      ? patientsThisMonthSettled.value.count
      : null;

  const monthAppointments = monthAppointmentsSettled.status === "fulfilled" ? monthAppointmentsSettled.value : [];
  const appointmentsError = monthAppointmentsSettled.status === "rejected";
  const appointments = monthAppointments.filter((a) => isSameClinicDay(new Date(a.scheduled_at), today));
  const upcomingAppointments = appointments.filter((a) => new Date(a.scheduled_at).getTime() >= nowMs()).slice(0, 2);

  const monthlyAppointmentsError = !(
    sixMonthAppointmentsSettled.status === "fulfilled" && !sixMonthAppointmentsSettled.value.error
  );
  const monthlyAppointments: MonthPoint[] = monthlyAppointmentsError
    ? []
    : bucketMonthlyAppointments(sixMonthAppointmentsSettled.status === "fulfilled" ? (sixMonthAppointmentsSettled.value.data ?? []) : []);

  let atRiskPatients: Awaited<ReturnType<typeof getAtRiskPatients>> = [];
  let atRiskError = false;
  if (isAdmin) {
    try {
      atRiskPatients = await getAtRiskPatients();
    } catch {
      atRiskError = true;
    }
  }

  let monthRevenue = 0;
  let prevMonthRevenue = 0;
  let revenueError = false;
  let topProducts: ProductShare[] = [];
  let topProductsTotal = 0;
  let monthlyRevenue: MonthPoint[] = [];
  let monthlyRevenueError = false;

  if (canSeeCobros) {
    type MonthSaleRow = {
      total: number;
      sale_items: { product_name: string; quantity: number; subtotal: number; service_id: string | null }[];
    };

    const [monthSalesSettled, prevMonthSalesSettled, sixMonthSalesSettled] = await Promise.allSettled([
      supabase
        .from("sales")
        .select("total, sale_items(product_name, quantity, subtotal, service_id)")
        .gte("created_at", monthStartISO)
        .eq("status", "pagado")
        .returns<MonthSaleRow[]>(),
      supabase
        .from("sales")
        .select("total")
        .gte("created_at", prevMonthStartISO)
        .lt("created_at", prevMonthEquivalentEndISO)
        .eq("status", "pagado"),
      supabase.from("sales").select("created_at, total").gte("created_at", sixMonthsAgoISO).eq("status", "pagado"),
    ]);

    if (monthSalesSettled.status === "fulfilled" && !monthSalesSettled.value.error) {
      const rows = monthSalesSettled.value.data ?? [];
      monthRevenue = rows.reduce((sum, s) => sum + s.total, 0);
      const { top, totalRevenue } = bucketTopProducts(rows.flatMap((s) => s.sale_items ?? []));
      topProducts = top;
      topProductsTotal = totalRevenue;
    } else {
      revenueError = true;
    }
    if (prevMonthSalesSettled.status === "fulfilled" && !prevMonthSalesSettled.value.error) {
      prevMonthRevenue = (prevMonthSalesSettled.value.data ?? []).reduce((sum, s) => sum + s.total, 0);
    } else {
      revenueError = true;
    }
    if (sixMonthSalesSettled.status === "fulfilled" && !sixMonthSalesSettled.value.error) {
      monthlyRevenue = bucketMonthlyRevenue(sixMonthSalesSettled.value.data ?? []);
    } else {
      monthlyRevenueError = true;
    }
  }

  const revenueTrendPct =
    prevMonthRevenue > 0 ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : undefined;

  const dailyAttended = bucketDailyAttended(monthAppointments);
  const serviceCounts = bucketServiceCounts(monthAppointments);
  const attendanceCounts = bucketAttendanceCounts(monthAppointments);

  const patientsKpi: Kpi = {
    label: "Pacientes registradas",
    value: patientsCount ?? 0,
    icon: <UsersIcon className="size-5" strokeWidth={2} />,
    tint: "var(--chart-3)",
    hint: patientsThisMonth ? `+${patientsThisMonth} este mes` : undefined,
    error: patientsCountError,
  };

  const revenueKpi: Kpi = {
    label: "Cobrado este mes",
    value: formatCurrency(monthRevenue),
    icon: <WalletIcon className="size-5" strokeWidth={2} />,
    tint: "var(--status-confirmed-fg)",
    trendPct: revenueTrendPct,
    error: revenueError,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AppointmentsTodayCard
          appointments={appointments}
          upcoming={upcomingAppointments}
          error={appointmentsError}
          className="sm:col-span-2"
        />
        <KpiCard kpi={patientsKpi} delay={0.06} />
        {canSeeCobros && <KpiCard kpi={revenueKpi} delay={0.12} />}
      </div>

      <h2 className="font-heading text-lg font-semibold text-foreground">Análisis del mes</h2>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AttendedAreaChart points={dailyAttended} error={appointmentsError} />
        </div>
        <AttendanceDonutChart
          atendida={attendanceCounts.atendida}
          cancelada={attendanceCounts.cancelada}
          error={appointmentsError}
        />
      </div>

      <div className={`grid grid-cols-1 gap-4 ${canSeeCobros ? "lg:grid-cols-3" : ""}`}>
        <div className={canSeeCobros ? "lg:col-span-2" : ""}>
          <ServiceTypeBarChart data={serviceCounts} error={appointmentsError} />
        </div>
        {canSeeCobros && (
          <TopProductsDonutChart top={topProducts} totalRevenue={topProductsTotal} error={revenueError} />
        )}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${canSeeCobros ? "lg:grid-cols-2" : ""}`}>
        <MonthlyBarChartCard
          title="Citas mensuales"
          icon={<CalendarDaysIcon className="size-[18px]" strokeWidth={1.75} />}
          points={monthlyAppointments}
          valueKind="count"
          color="var(--primary)"
          error={monthlyAppointmentsError}
          emptyMessage="Sin citas registradas en este período."
        />
        {canSeeCobros && (
          <MonthlyBarChartCard
            title="Ingresos mensuales"
            icon={<WalletIcon className="size-[18px]" strokeWidth={1.75} />}
            points={monthlyRevenue}
            valueKind="currency"
            color="var(--status-confirmed-fg)"
            error={monthlyRevenueError}
            emptyMessage="Sin ventas pagadas en este período."
          />
        )}
      </div>

      {isAdmin && (
        <AtRiskCard patients={atRiskPatients.slice(0, 5)} total={atRiskPatients.length} error={atRiskError} />
      )}
    </div>
  );
}
