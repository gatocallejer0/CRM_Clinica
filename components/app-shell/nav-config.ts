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
  FileUp,
  UserCog,
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
  { href: "/expediente", label: "Pacientes", icon: FileText, roles: ["Admin", "Doctor"] },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/cobros", label: "Cobros y pagos", icon: Receipt, roles: ["Admin", "Recepción"] },
  { href: "/reportes", label: "Reportes", icon: BarChart3, roles: ["Admin"] },
  { href: "/admin", label: "Admin Center", icon: ShieldCheck, roles: ["Admin", "Doctor"] },
];

export type AdminSection = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  roles: string[];
};

/** Subsecciones que se muestran como tarjetas dentro de /admin (Admin Center) — filtradas por rol. */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    description: "Crea y administra el acceso del personal.",
    icon: UserPlus,
    roles: ["Admin"],
  },
  {
    href: "/admin/formulario",
    label: "Formulario de pacientes",
    description: "Agrega o inactiva preguntas y opciones del registro.",
    icon: ClipboardList,
    roles: ["Admin"],
  },
  {
    href: "/admin/catalogo",
    label: "Catálogo e inventario",
    description: "Servicios, productos y ventas de la clínica.",
    icon: Boxes,
    roles: ["Admin"],
  },
  {
    href: "/admin/pacientes",
    label: "Carga masiva de pacientes",
    description: "Importa pacientes desde un CSV (ej. una base en Excel).",
    icon: FileUp,
    roles: ["Admin"],
  },
  {
    href: "/cuenta",
    label: "Mi cuenta",
    description: "Conecta tu Google Calendar para sincronizar tus citas.",
    icon: UserCog,
    roles: ["Admin", "Doctor"],
  },
];

const TITLES: Record<string, string> = Object.fromEntries([
  ...GENERAL_NAV.map((item) => [item.href, item.label]),
  ...ADMIN_NAV.map((item) => [item.href, item.label]),
  ...ADMIN_SECTIONS.map((item) => [item.href, item.label]),
]);

export function getScreenTitle(pathname: string): string {
  if (pathname.startsWith("/expediente/nuevo-registro")) return "Nuevo registro clínico";
  if (pathname.startsWith("/expediente/ficha/")) return "Ficha de paciente";
  if (pathname.startsWith("/expediente/")) return "Expediente clínico";
  if (pathname === "/cuenta") return "Mi cuenta";
  return TITLES[pathname] ?? "CRM Clínica";
}
