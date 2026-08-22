/**
 * Parser/generador de CSV mínimo (RFC 4180): comillas, comas y saltos de
 * línea dentro de celdas, comillas escapadas (""). Sin dependencias externas
 * — mismo criterio que lib/export-csv.ts (evitar librerías de terceros para
 * algo que no las necesita).
 */
export function parseCsv(rawText: string): string[][] {
  // Quita el BOM UTF-8 que Excel agrega al guardar, si está presente.
  const text = rawText.charCodeAt(0) === 0xfeff ? rawText.slice(1) : rawText;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += char;
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (char === "\r") {
      i++;
      continue;
    }
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += char;
    i++;
  }

  // Última celda/fila si el archivo no termina en salto de línea.
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Ignora filas totalmente vacías (ej. línea en blanco al final del archivo).
  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ""));
}

function escapeCsvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildCsv(rows: string[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}
