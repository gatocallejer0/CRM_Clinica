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
  HistoryIcon,
  KeyRoundIcon,
  type LucideIcon,
} from "lucide-react";
import type { ScreenKey } from "@/lib/auth/screens";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Pantalla configurable (Admin Center > Roles y permisos) que controla si aparece. Sin esto, siempre visible. */
  screenKey?: ScreenKey;
  /** true = solo el rol Admin la ve, nunca configurable para otros roles (evita escalar permisos). */
  adminOnly?: true;
};

export const GENERAL_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutGrid, screenKey: "dashboard" },
  { href: "/agenda", label: "Agenda", icon: CalendarDays, screenKey: "agenda" },
  { href: "/expediente", label: "Pacientes", icon: FileText, screenKey: "pacientes" },
];

export const ADMIN_NAV: NavItem[] = [
  { href: "/cobros", label: "Cobros y pagos", icon: Receipt, screenKey: "cobros" },
  { href: "/reportes", label: "Reportes", icon: BarChart3, screenKey: "reportes" },
  { href: "/admin", label: "Admin Center", icon: ShieldCheck, screenKey: "admin" },
];

export type AdminSection = NavItem & { description: string };

/** Subsecciones que se muestran como tarjetas dentro de /admin (Admin Center) — filtradas por pantalla habilitada. */
export const ADMIN_SECTIONS: AdminSection[] = [
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    description: "Crea y administra el acceso del personal.",
    icon: UserPlus,
    screenKey: "admin.usuarios",
  },
  {
    href: "/admin/formulario",
    label: "Formulario de pacientes",
    description: "Agrega o inactiva preguntas y opciones del registro.",
    icon: ClipboardList,
    screenKey: "admin.formulario",
  },
  {
    href: "/admin/catalogo",
    label: "Catálogo e inventario",
    description: "Servicios, productos y ventas de la clínica.",
    icon: Boxes,
    screenKey: "admin.catalogo",
  },
  {
    href: "/admin/pacientes",
    label: "Carga masiva de pacientes",
    description: "Importa pacientes desde un CSV (ej. una base en Excel).",
    icon: FileUp,
    screenKey: "admin.pacientes",
  },
  {
    href: "/admin/auditoria",
    label: "Auditoría",
    description: "Historial de acciones sobre usuarios, servicios y productos.",
    icon: HistoryIcon,
    screenKey: "admin.auditoria",
  },
  {
    href: "/admin/roles",
    label: "Roles y permisos",
    description: "Crea roles y controla qué pantallas puede ver cada uno.",
    icon: KeyRoundIcon,
    adminOnly: true,
  },
  {
    href: "/cuenta",
    label: "Mi cuenta",
    description: "Conecta tu Google Calendar para sincronizar tus citas.",
    icon: UserCog,
    screenKey: "cuenta",
  },
];

/**
 * Decide si `item` aparece para un rol dado. Admin siempre ve todo (nunca
 * pasa por `role_screens`, así no puede bloquearse el acceso a sí mismo).
 * `adminOnly` queda fuera del catálogo configurable a propósito — ver
 * lib/auth/screens.ts.
 */
export function isNavItemVisible(item: NavItem, roleName: string, allowedScreens: Set<string>): boolean {
  if (roleName === "Admin") return true;
  if (item.adminOnly) return false;
  if (!item.screenKey) return true;
  return allowedScreens.has(item.screenKey);
}

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
