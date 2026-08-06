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

/** Semanas de embarazo a partir de la fecha de última menstruación (FUM). */
export function computeGestationalWeeks(lastMenstrualPeriod: string | null): number | null {
  if (!lastMenstrualPeriod) return null;
  const fum = new Date(`${lastMenstrualPeriod}T00:00:00`);
  const days = Math.floor((Date.now() - fum.getTime()) / 86_400_000);
  if (days < 0 || days > 300) return null;
  return Math.floor(days / 7);
}

export function formatDateEs(dateStr: string): string {
  return new Intl.DateTimeFormat("es-GT", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${dateStr}T00:00:00`));
}
