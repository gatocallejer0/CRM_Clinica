"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { logAudit, diffSummary } from "@/lib/audit";
import { CONFIGURABLE_SCREENS, type ScreenKey } from "@/lib/auth/screens";

const SCREEN_LABELS = new Map<string, string>(CONFIGURABLE_SCREENS.map((s) => [s.key, s.label]));

export type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  userCount: number;
  screenKeys: string[];
};

/** Roles con su cantidad de usuarios y pantallas habilitadas. Admin-only. */
export async function listRolesWithUsage(): Promise<RoleRow[]> {
  await requireRole(["Admin"]);
  const admin = createAdminClient();

  const [{ data: roles, error: rolesError }, { data: profiles, error: profilesError }, { data: screens, error: screensError }] =
    await Promise.all([
      admin.from("roles").select("id, name, description").order("name"),
      admin.from("profiles").select("role_id"),
      admin.from("role_screens").select("role_id, screen_key"),
    ]);

  if (rolesError) throw new Error(rolesError.message);
  if (profilesError) throw new Error(profilesError.message);
  if (screensError) throw new Error(screensError.message);

  const userCountByRole = new Map<string, number>();
  for (const p of profiles ?? []) {
    userCountByRole.set(p.role_id, (userCountByRole.get(p.role_id) ?? 0) + 1);
  }

  const screensByRole = new Map<string, string[]>();
  for (const s of screens ?? []) {
    const list = screensByRole.get(s.role_id) ?? [];
    list.push(s.screen_key);
    screensByRole.set(s.role_id, list);
  }

  return (roles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    userCount: userCountByRole.get(r.id) ?? 0,
    screenKeys: r.name === "Admin" ? CONFIGURABLE_SCREENS.map((s) => s.key) : (screensByRole.get(r.id) ?? []),
  }));
}

export type RoleFormState = { error?: string; success?: boolean } | undefined;

const RoleSchema = z.object({
  name: z.string().min(2, { error: "El nombre es muy corto." }).trim(),
  description: z.string().trim().optional(),
});

/** Crea un rol nuevo. Empieza sin pantallas habilitadas — hay que asignárselas aparte. Admin-only. */
export async function createRole(_prevState: RoleFormState, formData: FormData): Promise<RoleFormState> {
  const profile = await requireRole(["Admin"]);

  const validatedFields = RoleSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!validatedFields.success) {
    return { error: "Revisa los datos del formulario." };
  }

  const { name, description } = validatedFields.data;
  const admin = createAdminClient();

  const { data: created, error } = await admin
    .from("roles")
    .insert({ name, description: description ?? null })
    .select("id")
    .single();

  if (error) {
    return { error: error.code === "23505" ? "Ya existe un rol con ese nombre." : error.message };
  }

  await logAudit({
    tableName: "roles",
    recordId: created.id,
    action: "create",
    summary: `Creó el rol "${name}".`,
    performedBy: profile,
  });

  revalidatePath("/admin/roles");
  return { success: true };
}

const UpdateRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, { error: "El nombre es muy corto." }).trim(),
  description: z.string().trim().optional(),
});

/** Edita nombre/descripción de un rol. No permite tocar el rol Admin. Admin-only. */
export async function updateRole(_prevState: RoleFormState, formData: FormData): Promise<RoleFormState> {
  const profile = await requireRole(["Admin"]);

  const validatedFields = UpdateRoleSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!validatedFields.success) {
    return { error: "Revisa los datos del formulario." };
  }

  const { id, name, description } = validatedFields.data;
  const admin = createAdminClient();

  const { data: before } = await admin.from("roles").select("name, description").eq("id", id).single();

  if (before?.name === "Admin") {
    return { error: "El rol Admin no se puede editar." };
  }

  const { error } = await admin.from("roles").update({ name, description: description ?? null }).eq("id", id);

  if (error) {
    return { error: error.code === "23505" ? "Ya existe un rol con ese nombre." : error.message };
  }

  if (before) {
    const summary = diffSummary(
      { name: before.name, description: before.description },
      { name, description: description ?? null },
      { name: "Nombre", description: "Descripción" },
    );
    if (summary) {
      await logAudit({ tableName: "roles", recordId: id, action: "update", summary, performedBy: profile });
    }
  }

  revalidatePath("/admin/roles");
  return { success: true };
}

/** Elimina un rol sin usuarios asignados. No permite eliminar Admin. Admin-only. */
export async function deleteRole(id: string): Promise<{ error?: string }> {
  const profile = await requireRole(["Admin"]);
  const admin = createAdminClient();

  const { data: role } = await admin.from("roles").select("name").eq("id", id).single();
  if (!role) {
    return { error: "Rol no encontrado." };
  }
  if (role.name === "Admin") {
    return { error: "El rol Admin no se puede eliminar." };
  }

  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role_id", id);

  if (count && count > 0) {
    return { error: `No puedes eliminar "${role.name}": tiene ${count} usuario(s) asignado(s).` };
  }

  const { error } = await admin.from("roles").delete().eq("id", id);
  if (error) {
    return { error: error.message };
  }

  await logAudit({
    tableName: "roles",
    recordId: id,
    action: "delete",
    summary: `Eliminó el rol "${role.name}".`,
    performedBy: profile,
  });

  revalidatePath("/admin/roles");
  return {};
}

/** Reemplaza el conjunto de pantallas habilitadas para un rol. No permite tocar Admin. Admin-only. */
export async function updateRoleScreens(roleId: string, screenKeys: string[]): Promise<{ error?: string }> {
  const profile = await requireRole(["Admin"]);

  const validKeys = new Set(CONFIGURABLE_SCREENS.map((s) => s.key));
  screenKeys = screenKeys.filter((k): k is ScreenKey => validKeys.has(k as ScreenKey));

  const admin = createAdminClient();

  const { data: role } = await admin.from("roles").select("name").eq("id", roleId).single();
  if (!role) {
    return { error: "Rol no encontrado." };
  }
  if (role.name === "Admin") {
    return { error: "El rol Admin siempre tiene acceso a todo." };
  }

  const { data: before } = await admin.from("role_screens").select("screen_key").eq("role_id", roleId);
  const beforeKeys = new Set((before ?? []).map((r) => r.screen_key));

  const { error: deleteError } = await admin.from("role_screens").delete().eq("role_id", roleId);
  if (deleteError) {
    return { error: deleteError.message };
  }

  if (screenKeys.length > 0) {
    const { error: insertError } = await admin
      .from("role_screens")
      .insert(screenKeys.map((screen_key) => ({ role_id: roleId, screen_key })));
    if (insertError) {
      return { error: insertError.message };
    }
  }

  const afterKeys = new Set(screenKeys);
  const added = screenKeys.filter((k) => !beforeKeys.has(k)).map((k) => SCREEN_LABELS.get(k) ?? k);
  const removed = [...beforeKeys].filter((k) => !afterKeys.has(k)).map((k) => SCREEN_LABELS.get(k) ?? k);
  const changes: string[] = [];
  if (added.length > 0) changes.push(`Agregó: ${added.join(", ")}`);
  if (removed.length > 0) changes.push(`Quitó: ${removed.join(", ")}`);

  if (changes.length > 0) {
    await logAudit({
      tableName: "roles",
      recordId: roleId,
      action: "update",
      summary: `Permisos de "${role.name}" — ${changes.join("; ")}.`,
      performedBy: profile,
    });
  }

  revalidatePath("/admin/roles");
  return {};
}
