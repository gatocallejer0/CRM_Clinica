export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

export function computeBmi(weightKg: number | null, heightCm: number | null): string | null {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
}

export type GestationalAge = { weeks: number; days: number };

export type PregnancyEstimate = {
  age: GestationalAge;
  dueDate: string;
  source: "ultrasound" | "fum" | "manual";
};

const PREGNANCY_SOURCE_LABEL: Record<PregnancyEstimate["source"], string> = {
  ultrasound: "calculado a partir del ultrasonido",
  fum: "calculado a partir de la FUM",
  manual: "según fecha probable de parto indicada",
};

export function pregnancySourceLabel(source: PregnancyEstimate["source"]): string {
  return PREGNANCY_SOURCE_LABEL[source];
}

function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ageFromTotalDays(totalDays: number): GestationalAge | null {
  if (totalDays < 0 || totalDays > 300) return null;
  return { weeks: Math.floor(totalDays / 7), days: totalDays % 7 };
}

/**
 * Edad gestacional actual y fecha probable de parto (FPP), con la fuente
 * más confiable disponible: ultrasonido de datación (semanas/días medidos
 * en el estudio, igual que una calculadora obstétrica estándar) > FUM
 * (Regla de Naegele: FPP = FUM + 280 días) > FPP indicada manualmente
 * (solo se captura cuando no se conoce la FUM).
 */
export function computePregnancy(input: {
  lastMenstrualPeriod: string | null;
  estimatedDueDate: string | null;
  ultrasoundDate: string | null;
  ultrasoundWeeks: number | null;
  ultrasoundDays: number | null;
}): PregnancyEstimate | null {
  const { lastMenstrualPeriod, estimatedDueDate, ultrasoundDate, ultrasoundWeeks, ultrasoundDays } = input;

  if (ultrasoundDate && ultrasoundWeeks !== null) {
    const usg = new Date(`${ultrasoundDate}T00:00:00`);
    const daysAtUsg = ultrasoundWeeks * 7 + (ultrasoundDays ?? 0);
    const elapsedDays = Math.floor((Date.now() - usg.getTime()) / 86_400_000);
    const age = ageFromTotalDays(daysAtUsg + elapsedDays);
    if (!age) return null;
    return { age, dueDate: addDaysToDateStr(ultrasoundDate, 280 - daysAtUsg), source: "ultrasound" };
  }

  if (lastMenstrualPeriod) {
    const fum = new Date(`${lastMenstrualPeriod}T00:00:00`);
    const age = ageFromTotalDays(Math.floor((Date.now() - fum.getTime()) / 86_400_000));
    if (!age) return null;
    return { age, dueDate: addDaysToDateStr(lastMenstrualPeriod, 280), source: "fum" };
  }

  if (estimatedDueDate) {
    const fpp = new Date(`${estimatedDueDate}T00:00:00`);
    const age = ageFromTotalDays(280 - Math.floor((fpp.getTime() - Date.now()) / 86_400_000));
    if (!age) return null;
    return { age, dueDate: estimatedDueDate, source: "manual" };
  }

  return null;
}

export function formatGestationalAge(age: GestationalAge): string {
  return `${age.weeks} sem, ${age.days} d`;
}

export function formatDateEs(dateStr: string): string {
  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateStr}T00:00:00`));
}
