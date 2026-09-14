/**
 * Catálogo de pantallas configurables desde Admin Center > Roles y permisos.
 * Vive en código (no en la base) porque las pantallas existen porque hay
 * páginas — agregar una fila acá no crea la pantalla, solo la hace
 * configurable. "admin.roles" (esta misma pantalla) queda fuera a propósito:
 * es Admin-only fijo, nunca asignable a otro rol (ver requireRole directo en
 * app/(app)/admin/roles/page.tsx).
 */

export const CONFIGURABLE_SCREENS = [
  { key: "dashboard", label: "Dashboard", group: "General" },
  { key: "agenda", label: "Agenda", group: "General" },
  { key: "pacientes", label: "Pacientes", group: "General" },
  { key: "cobros", label: "Cobros y pagos", group: "General" },
  { key: "reportes", label: "Reportes", group: "General" },
  { key: "admin", label: "Admin Center", group: "General" },
  { key: "cuenta", label: "Mi cuenta", group: "General" },
  { key: "admin.usuarios", label: "Usuarios", group: "Admin Center" },
  { key: "admin.formulario", label: "Formulario de pacientes", group: "Admin Center" },
  { key: "admin.catalogo", label: "Catálogo e inventario", group: "Admin Center" },
  { key: "admin.pacientes", label: "Carga masiva de pacientes", group: "Admin Center" },
  { key: "admin.auditoria", label: "Auditoría", group: "Admin Center" },
] as const;

export type ScreenKey = (typeof CONFIGURABLE_SCREENS)[number]["key"];

export const ALL_SCREEN_KEYS: ScreenKey[] = CONFIGURABLE_SCREENS.map((s) => s.key);
