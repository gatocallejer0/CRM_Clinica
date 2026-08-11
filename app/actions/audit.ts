"use server";

import { requireRole } from "@/lib/auth/roles";
import { getAuditLog, type AuditLogEntry } from "@/lib/audit";

/** Historial de cambios de una fila (tabla + id), más reciente primero. Admin-only. */
export async function getRecordAuditLog(tableName: string, recordId: string): Promise<AuditLogEntry[]> {
  await requireRole(["Admin"]);
  return getAuditLog(tableName, recordId);
}
