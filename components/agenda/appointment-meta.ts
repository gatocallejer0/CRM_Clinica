import type { AppointmentStatus, ServiceCategory } from "@/app/actions/appointments";

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  confirmada: "Confirmada",
  en_espera: "En espera",
  atendida: "Atendida",
  cancelada: "Cancelada",
};

export const STATUS_STYLE: Record<AppointmentStatus, { color: string; backgroundColor: string }> = {
  confirmada: { color: "var(--status-confirmed-fg)", backgroundColor: "var(--status-confirmed-bg)" },
  en_espera: { color: "var(--status-waiting-fg)", backgroundColor: "var(--status-waiting-bg)" },
  atendida: { color: "var(--status-done-fg)", backgroundColor: "var(--status-done-bg)" },
  cancelada: { color: "var(--status-cancelled-fg)", backgroundColor: "var(--status-cancelled-bg)" },
};

export const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  prenatal: "Prenatal",
  general: "General",
  seguimiento: "Seguimiento",
};

export const CATEGORY_COLOR: Record<ServiceCategory, string> = {
  prenatal: "var(--type-prenatal)",
  general: "var(--type-general)",
  seguimiento: "var(--type-seguimiento)",
};
