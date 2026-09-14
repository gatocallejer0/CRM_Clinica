"use server";

import { requireScreen } from "@/lib/auth/roles";
import { getAuditLog, type AuditLogEntry } from "@/lib/audit";

/**
 * Historial de cambios de una fila (tabla + id), más reciente primero.
 * Pantalla: admin.auditoria — ver el historial (aunque se abra desde el
 * botón "Ver historial" de otra pantalla, ej. Usuarios) requiere ese
 * permiso específico, igual que la pantalla de Auditoría completa.
 */
export async function getRecordAuditLog(tableName: string, recordId: string): Promise<AuditLogEntry[]> {
  await requireScreen("admin.auditoria");
  return getAuditLog(tableName, recordId);
}
