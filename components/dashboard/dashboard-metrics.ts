import type { AppointmentStatus } from "@/app/actions/appointments";
import {
  toClinicDateKey,
  formatClinicDayNumber,
  formatClinicMonthLabel,
  addDays,
  addMonths,
  startOfMonth,
  clinicDayOfMonth,
  clinicToday,
} from "@/lib/clinic-time";

export type DailyPoint = { dateKey: string; dayLabel: string; value: number };
export type MonthPoint = { monthKey: string; monthLabel: string; value: number };

/** Citas atendidas por día, del 1 del mes en curso a hoy (incluye los días en cero). */
export function bucketDailyAttended(appointments: { scheduled_at: string; status: AppointmentStatus }[]): DailyPoint[] {
  const countsByDay = new Map<string, number>();
  for (const a of appointments) {
    if (a.status !== "atendida") continue;
    const key = toClinicDateKey(new Date(a.scheduled_at));
    countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }

  const today = clinicToday();
  const monthStart = startOfMonth(today);
  const daysElapsed = clinicDayOfMonth(today);
  const points: DailyPoint[] = [];
  for (let i = 0; i < daysElapsed; i++) {
    const d = addDays(monthStart, i);
    const dateKey = toClinicDateKey(d);
    points.push({ dateKey, dayLabel: formatClinicDayNumber(d), value: countsByDay.get(dateKey) ?? 0 });
  }
  return points;
}

/** Ingresos pagados por mes, últimos `months` meses (incluye el mes en curso y los meses en cero). */
export function bucketMonthlyRevenue(sales: { created_at: string; total: number }[], months = 6): MonthPoint[] {
  const totalsByMonth = new Map<string, number>();
  for (const s of sales) {
    const key = toClinicDateKey(new Date(s.created_at)).slice(0, 7);
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + s.total);
  }
  return bucketMonths(totalsByMonth, months);
}

/** Citas no canceladas por mes, últimos `months` meses. */
export function bucketMonthlyAppointments(
  appointments: { scheduled_at: string; status: AppointmentStatus }[],
  months = 6,
): MonthPoint[] {
  const countsByMonth = new Map<string, number>();
  for (const a of appointments) {
    if (a.status === "cancelada") continue;
    const key = toClinicDateKey(new Date(a.scheduled_at)).slice(0, 7);
    countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1);
  }
  return bucketMonths(countsByMonth, months);
}

function bucketMonths(totals: Map<string, number>, months: number): MonthPoint[] {
  const today = clinicToday();
  const points: MonthPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = addMonths(today, -i);
    const monthKey = toClinicDateKey(d).slice(0, 7);
    points.push({
      monthKey,
      monthLabel: formatClinicMonthLabel(d).split(" ")[0],
      value: totals.get(monthKey) ?? 0,
    });
  }
  return points;
}

/** Atendidas vs. canceladas dentro del conjunto de citas dado (normalmente el mes en curso). */
export function bucketAttendanceCounts(appointments: { status: AppointmentStatus }[]): {
  atendida: number;
  cancelada: number;
} {
  let atendida = 0;
  let cancelada = 0;
  for (const a of appointments) {
    if (a.status === "atendida") atendida += 1;
    else if (a.status === "cancelada") cancelada += 1;
  }
  return { atendida, cancelada };
}

export type ServiceCount = { name: string; count: number };

/** Citas no canceladas agrupadas por servicio, de mayor a menor. */
export function bucketServiceCounts(
  appointments: { service_name: string; status: AppointmentStatus }[],
): ServiceCount[] {
  const counts = new Map<string, number>();
  for (const a of appointments) {
    if (a.status === "cancelada") continue;
    counts.set(a.service_name, (counts.get(a.service_name) ?? 0) + 1);
  }
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

export type ProductShare = { name: string; revenue: number; quantity: number; pct: number };

/** Top `limit` productos (no servicios) por ingreso, con su % del total de productos vendidos. */
export function bucketTopProducts(
  items: { product_name: string; subtotal: number; quantity: number; service_id: string | null }[],
  limit = 7,
): { top: ProductShare[]; totalRevenue: number } {
  const products = items.filter((i) => i.service_id === null);
  const totalRevenue = products.reduce((sum, i) => sum + i.subtotal, 0);

  const byName = new Map<string, { revenue: number; quantity: number }>();
  for (const i of products) {
    const row = byName.get(i.product_name) ?? { revenue: 0, quantity: 0 };
    row.revenue += i.subtotal;
    row.quantity += i.quantity;
    byName.set(i.product_name, row);
  }

  const top = [...byName.entries()]
    .map(([name, r]) => ({
      name,
      revenue: r.revenue,
      quantity: r.quantity,
      pct: totalRevenue > 0 ? (r.revenue / totalRevenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);

  return { top, totalRevenue };
}
