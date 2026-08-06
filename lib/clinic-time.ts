/**
 * La clínica opera en horario de Guatemala (UTC-6, sin horario de verano).
 * Todas las fechas se guardan como timestamptz (UTC) en la base; estos
 * helpers convierten entre "fecha/hora tal como la vive el personal en
 * Guatemala" y el timestamp real, sin depender de la zona horaria del
 * servidor donde corra Next.js.
 */

const CLINIC_TZ = "America/Guatemala";
const CLINIC_UTC_OFFSET = "-06:00";

/** Combina un date input (yyyy-mm-dd) y un time input (HH:mm) en un Date real. */
export function combineClinicDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00${CLINIC_UTC_OFFSET}`);
}

/** yyyy-mm-dd de un Date, en hora de Guatemala. */
export function toClinicDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function formatClinicTime(date: Date): string {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: CLINIC_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatClinicWeekday(date: Date, style: "short" | "long" = "short"): string {
  return new Intl.DateTimeFormat("es-GT", { timeZone: CLINIC_TZ, weekday: style }).format(date);
}

export function formatClinicDayNumber(date: Date): string {
  return new Intl.DateTimeFormat("es-GT", { timeZone: CLINIC_TZ, day: "numeric" }).format(date);
}

export function formatClinicMonthLabel(date: Date): string {
  const label = new Intl.DateTimeFormat("es-GT", {
    timeZone: CLINIC_TZ,
    month: "long",
    year: "numeric",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatClinicDateLong(date: Date): string {
  const label = new Intl.DateTimeFormat("es-GT", {
    timeZone: CLINIC_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** "Hoy" en hora de Guatemala, a medianoche UTC-6 (para navegación por día/semana/mes). */
export function clinicToday(): Date {
  const key = toClinicDateKey(new Date());
  return combineClinicDateTime(key, "00:00");
}

export function addDays(date: Date, days: number): Date {
  const key = toClinicDateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days, 6)); // mediodía UTC evita saltos de día por el offset
  return combineClinicDateTime(toClinicDateKey(next), "00:00");
}

export function addMonths(date: Date, months: number): Date {
  const key = toClinicDateKey(date);
  const [y, m] = key.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1 + months, 1, 6));
  return combineClinicDateTime(toClinicDateKey(next), "00:00");
}

/** Lunes de la semana que contiene `date` (hora de Guatemala). */
export function startOfWeek(date: Date): Date {
  const key = toClinicDateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0=domingo
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDays(combineClinicDateTime(key, "00:00"), diffToMonday);
}

/** Primer día del mes que contiene `date` (hora de Guatemala). */
export function startOfMonth(date: Date): Date {
  const key = toClinicDateKey(date);
  const [y, m] = key.split("-").map(Number);
  return combineClinicDateTime(`${y}-${String(m).padStart(2, "0")}-01`, "00:00");
}

export function isSameClinicDay(a: Date, b: Date): boolean {
  return toClinicDateKey(a) === toClinicDateKey(b);
}
