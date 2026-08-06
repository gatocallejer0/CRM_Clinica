import {
  LayoutGrid,
  CalendarDays,
  FileText,
  UserPlus,
  ClipboardList,
  Boxes,
  Receipt,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: string[];
};

export const GENERAL_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutGrid, roles: ["Admin", "Doctor", "Recepción"] },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, roles: ["Admin", "Doctor", "Recepción"] },
  { href: "/expediente", label: "Expediente clínico", icon: FileText, roles: ["Admin", "Doctor"] },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin/usuarios", label: "Nuevo usuario", icon: UserPlus, roles: ["Admin"] },
  { href: "/admin/formulario", label: "Formulario de pacientes", icon: ClipboardList, roles: ["Admin"] },
  { href: "/catalogo", label: "Catálogo e inventario", icon: Boxes, roles: ["Admin"] },
  { href: "/cobros", label: "Cobros y pagos", icon: Receipt, roles: ["Admin"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["Admin"] },
];

const TITLES: Record<string, string> = Object.fromEntries(
  [...GENERAL_NAV, ...ADMIN_NAV].map((item) => [item.href, item.label]),
);

export function getScreenTitle(pathname: string): string {
  return TITLES[pathname] ?? "CRM Clínica";
}
