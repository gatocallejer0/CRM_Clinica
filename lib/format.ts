const CURRENCY_FORMAT = new Intl.NumberFormat("es-GT", {
  style: "currency",
  currency: "GTQ",
  minimumFractionDigits: 2,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return CURRENCY_FORMAT.format(value);
}

/** Versión corta para etiquetas de gráficas ("Q1.2K" en vez de "Q1,234.56"). */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `Q${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `Q${(value / 1_000).toFixed(1)}K`;
  return `Q${Math.round(value)}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
