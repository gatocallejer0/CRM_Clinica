import type { SaleRow } from "@/app/actions/catalog";
import { toClinicDateKey, formatClinicMonthLabel, addMonths, clinicToday } from "@/lib/clinic-time";

/** Ventas que cuentan como "vendido" para las métricas — un borrador todavía no es una venta concretada. */
function countedSales(sales: SaleRow[]): SaleRow[] {
  return sales.filter((s) => s.status !== "borrador");
}

export type MonthlyRevenueRow = { monthKey: string; monthLabel: string; total: number };

/** Monto vendido de los últimos 6 meses (incluye meses en cero para que la comparación sea justa). */
export function getMonthlyRevenue(sales: SaleRow[], monthsBack = 6): MonthlyRevenueRow[] {
  const totalsByMonth = new Map<string, number>();
  for (const s of countedSales(sales)) {
    const key = toClinicDateKey(new Date(s.created_at)).slice(0, 7);
    totalsByMonth.set(key, (totalsByMonth.get(key) ?? 0) + s.total);
  }

  const today = clinicToday();
  const months: MonthlyRevenueRow[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = addMonths(today, -i);
    const monthKey = toClinicDateKey(d).slice(0, 7);
    months.push({
      monthKey,
      monthLabel: formatClinicMonthLabel(d),
      total: totalsByMonth.get(monthKey) ?? 0,
    });
  }
  return months;
}

export type TopItemRow = { name: string; quantity: number; revenue: number };

/** Productos/servicios más vendidos por cantidad. */
export function getTopItems(sales: SaleRow[], limit = 5): TopItemRow[] {
  const byName = new Map<string, TopItemRow>();
  for (const s of countedSales(sales)) {
    for (const item of s.items) {
      const row = byName.get(item.product_name) ?? { name: item.product_name, quantity: 0, revenue: 0 };
      row.quantity += item.quantity;
      row.revenue += item.subtotal;
      byName.set(item.product_name, row);
    }
  }
  return [...byName.values()].sort((a, b) => b.quantity - a.quantity).slice(0, limit);
}

export type TopSellerRow = { name: string; revenue: number; count: number };

/** Vendedores con más ventas por monto total cobrado. */
export function getTopSellers(sales: SaleRow[], limit = 5): TopSellerRow[] {
  const byName = new Map<string, TopSellerRow>();
  for (const s of countedSales(sales)) {
    const row = byName.get(s.sold_by_name) ?? { name: s.sold_by_name, revenue: 0, count: 0 };
    row.revenue += s.total;
    row.count += 1;
    byName.set(s.sold_by_name, row);
  }
  return [...byName.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}
