import type { SaleStatus } from "@/app/actions/catalog";

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  borrador: "Borrador",
  pagado: "Pagado",
  pendiente_pago: "Pendiente de pago",
};

export const SALE_STATUS_STYLE: Record<SaleStatus, { color: string; backgroundColor: string }> = {
  borrador: { color: "var(--status-done-fg)", backgroundColor: "var(--status-done-bg)" },
  pagado: { color: "var(--status-confirmed-fg)", backgroundColor: "var(--status-confirmed-bg)" },
  pendiente_pago: { color: "var(--status-waiting-fg)", backgroundColor: "var(--status-waiting-bg)" },
};
