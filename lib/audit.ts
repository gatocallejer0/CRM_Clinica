import "server-only";

import { createAdminClient } from "@/lib/supabase/server";

export type AuditAction = "create" | "update" | "delete";

export type AuditLogEntry = {
  id: string;
  action: AuditAction;
  summary: string;
  performed_by_name: string;
  created_at: string;
};

/**
 * Registra una entrada en la bitácora de auditoría. Usa el admin client a
 * propósito: `audit_log` no tiene policy de insert para `authenticated`, así
 * que solo el código del servidor (que ya validó el rol de quien llama)
 * puede escribir aquí — nadie puede insertar una entrada falsa desde el
 * cliente.
 */
export async function logAudit(entry: {
  tableName: string;
  recordId: string;
  action: AuditAction;
  summary: string;
  performedBy: { id: string; full_name: string };
}): Promise<void> {
  const admin = createAdminClient();

  await admin.from("audit_log").insert({
    table_name: entry.tableName,
    record_id: entry.recordId,
    action: entry.action,
    summary: entry.summary,
    performed_by: entry.performedBy.id,
    performed_by_name: entry.performedBy.full_name,
  });
}

/** Historial de una fila específica, más reciente primero. Admin-only (RLS). */
export async function getAuditLog(tableName: string, recordId: string): Promise<AuditLogEntry[]> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("audit_log")
    .select("id, action, summary, performed_by_name, created_at")
    .eq("table_name", tableName)
    .eq("record_id", recordId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Compara dos objetos "planos" y arma un resumen legible de lo que cambió. */
export function diffSummary(
  before: Record<string, string | number | boolean | null>,
  after: Record<string, string | number | boolean | null>,
  labels: Record<string, string>,
): string | null {
  const changes: string[] = [];

  for (const key of Object.keys(labels)) {
    const prev = before[key];
    const next = after[key];
    if (prev === next) continue;
    changes.push(`${labels[key]}: "${prev ?? "—"}" → "${next ?? "—"}"`);
  }

  return changes.length > 0 ? changes.join("; ") : null;
}
