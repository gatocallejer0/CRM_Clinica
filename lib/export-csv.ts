"use client";

/**
 * Exporta filas a un .csv que Excel abre nativamente (doble clic). Evita a
 * propósito librerías de generación de .xlsx (ej. el paquete "xlsx" de
 * SheetJS en npm tiene vulnerabilidades de alta severidad sin parche
 * disponible) — no hace falta ese riesgo para un export de solo lectura.
 */
export function exportRowsToCsv(filename: string, rows: Record<string, string | number>[]): void {
  if (rows.length === 0) return;

  const headers = Object.keys(rows[0]);
  const escapeCell = (value: string | number): string => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };

  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => headers.map((h) => escapeCell(row[h])).join(",")),
  ];

  // BOM: Excel necesita esto para leer acentos/ñ en UTF-8 sin romperlos.
  const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
