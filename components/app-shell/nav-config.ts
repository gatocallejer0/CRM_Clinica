import {
  LayoutGrid,
  CalendarDays,
  FileText,
  ShieldCheck,
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
  { href: "/cobros", label: "Cobros y pagos", icon: Receipt, roles: ["Admin"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["Admin"] },
  { href: "/admin", label: "Admin Center", icon: ShieldCheck, roles: ["Admin"] },
];

export type AdminSection = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

/** Subsecciones que se muestran como tarjetas dentro de /admin (Admin Center). */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    description: "Crea y administra el acceso del personal.",
    icon: UserPlus,
  },
  {
    href: "/admin/formulario",
    label: "Formulario de pacientes",
    description: "Agrega o inactiva preguntas y opciones del registro.",
    icon: ClipboardList,
  },
  {
    href: "/admin/catalogo",
    label: "Catálogo e inventario",
    description: "Servicios, productos y ventas de la clínica.",
    icon: Boxes,
  },
];

const TITLES: Record<string, string> = Object.fromEntries([
  ...GENERAL_NAV.map((item) => [item.href, item.label]),
  ...ADMIN_NAV.map((item) => [item.href, item.label]),
  ...ADMIN_SECTIONS.map((item) => [item.href, item.label]),
]);

export function getScreenTitle(pathname: string): string {
  return TITLES[pathname] ?? "CRM Clínica";
}
