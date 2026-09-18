"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireScreen } from "@/lib/auth/roles";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import { generateTempPassword, TEMP_PASSWORD_TTL_MS } from "@/lib/password";

type AdminClient = ReturnType<typeof createAdminClient>;

async function getRoleName(admin: AdminClient, roleId: string): Promise<string> {
  const { data } = await admin.from("roles").select("name").eq("id", roleId).single();
  return data?.name ?? roleId;
}

/** Rol actual de un perfil dado su id — para chequear el rol del *objetivo* de una acción (ej. a quién se le resetea la contraseña), no el rol que se le va a asignar. */
async function getCurrentRoleName(admin: AdminClient, profileId: string): Promise<string | null> {
  const { data } = await admin
    .from("profiles")
    .select("role:roles(name)")
    .eq("id", profileId)
    .single<{ role: { name: string } | { name: string }[] | null }>();
  const role = data?.role;
  return (Array.isArray(role) ? role[0]?.name : role?.name) ?? null;
}

export type Role = {
  id: string;
  name: string;
  description: string | null;
};

export type UserRow = {
  id: string;
  full_name: string;
  active: boolean;
  role: { id: string; name: string } | null;
  email: string;
};

/** All roles available, for populating the "role" select. Admin-only. */
export async function listRoles(): Promise<Role[]> {
  await requireScreen("admin.usuarios");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, description")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

/** All users with their profile + role + email. Admin-only. */
export async function listUsers(): Promise<UserRow[]> {
  await requireScreen("admin.usuarios");
  const admin = createAdminClient();

  type ProfileRow = {
    id: string;
    full_name: string;
    active: boolean;
    role: { id: string; name: string } | { id: string; name: string }[] | null;
  };

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id, full_name, active, role:roles(id, name)")
    .order("full_name")
    .returns<ProfileRow[]>();

  if (error) throw new Error(error.message);

  const {
    data: { users },
  } = await admin.auth.admin.listUsers({ perPage: 1000 });

  const emailById = new Map(
    users.map((u: { id: string; email?: string }) => [u.id, u.email ?? ""]),
  );

  return (profiles ?? []).map((p): UserRow => ({
    ...p,
    role: Array.isArray(p.role) ? (p.role[0] ?? null) : p.role,
    email: emailById.get(p.id) ?? "",
  }));
}

const CreateUserSchema = z.object({
  fullName: z.string().min(2, { error: "El nombre es muy corto." }).trim(),
  email: z.email({ error: "Ingresa un correo válido." }),
  roleId: z.string().uuid({ error: "Selecciona un rol." }),
});

export type UserFormState =
  | {
      error?: string;
      success?: boolean;
      generatedPassword?: string;
      passwordExpiresAt?: string;
    }
  | undefined;

/**
 * Creates a new auth user + profile row, assigning the given role.
 * Admin-only. Uses the service_role key (createAdminClient) which bypasses
 * RLS, so the caller's role MUST be verified first via requireScreen.
 */
export async function createUser(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const profile = await requireScreen("admin.usuarios");

  const validatedFields = CreateUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
  });

  if (!validatedFields.success) {
    return { error: "Revisa los datos del formulario." };
  }

  const { fullName, email, roleId } = validatedFields.data;
  const admin = createAdminClient();

  // La pantalla "admin.usuarios" se puede delegar a un rol personalizado
  // (ej. "Recursos Humanos") sin darle Admin completo — así que crear una
  // cuenta con rol Admin queda reservado a quien ya es Admin. Sin esto,
  // ese rol delegado podría fabricarse una cuenta Admin persistente.
  const roleName = await getRoleName(admin, roleId);
  if (roleName === "Admin" && profile.role.name !== "Admin") {
    return { error: "Solo un Admin puede crear una cuenta con rol Admin." };
  }

  const password = generateTempPassword();
  const passwordExpiresAt = new Date(Date.now() + TEMP_PASSWORD_TTL_MS).toISOString();

  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !created.user) {
    return { error: createError?.message ?? "No se pudo crear el usuario." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    full_name: fullName,
    role_id: roleId,
    active: true,
    temp_password_expires_at: passwordExpiresAt,
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned account.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileError.message };
  }

  await logAudit({
    tableName: "profiles",
    recordId: created.user.id,
    action: "create",
    summary: `Creó el usuario "${fullName}" (${email}) con rol ${roleName}.`,
    performedBy: profile,
  });

  revalidatePath("/admin/usuarios");
  return { success: true, generatedPassword: password, passwordExpiresAt };
}

const ResetPasswordSchema = z.object({
  id: z.string().uuid({ error: "Usuario inválido." }),
});

export type ResetPasswordState =
  | {
      error?: string;
      password?: string;
      passwordExpiresAt?: string;
    }
  | undefined;

/**
 * Genera y asigna una nueva contraseña temporal (vence en 2 horas) a un
 * usuario existente. Útil cuando la anterior expiró sin que el colaborador
 * iniciara sesión. Admin-only.
 */
export async function resetUserPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const profile = await requireScreen("admin.usuarios");

  const validatedFields = ResetPasswordSchema.safeParse({ id: formData.get("id") });
  if (!validatedFields.success) {
    return { error: "Usuario inválido." };
  }

  const { id } = validatedFields.data;
  const admin = createAdminClient();

  // Mismo motivo que en createUser: "admin.usuarios" puede ser un rol
  // delegado sin privilegios de Admin. Sin este chequeo, ese rol podría
  // resetear la contraseña de una cuenta Admin real y tomarla por completo.
  const targetRoleName = await getCurrentRoleName(admin, id);
  if (targetRoleName === "Admin" && profile.role.name !== "Admin") {
    return { error: "Solo un Admin puede resetear la contraseña de otra cuenta Admin." };
  }

  const password = generateTempPassword();
  const passwordExpiresAt = new Date(Date.now() + TEMP_PASSWORD_TTL_MS).toISOString();

  const { error: authError } = await admin.auth.admin.updateUserById(id, { password });
  if (authError) {
    return { error: authError.message };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ temp_password_expires_at: passwordExpiresAt })
    .eq("id", id);

  if (profileError) {
    return { error: profileError.message };
  }

  await logAudit({
    tableName: "profiles",
    recordId: id,
    action: "update",
    summary: "Generó una nueva contraseña temporal.",
    performedBy: profile,
  });

  revalidatePath("/admin/usuarios");
  return { password, passwordExpiresAt };
}

const UpdateUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(2, { error: "El nombre es muy corto." }).trim(),
  email: z.email({ error: "Ingresa un correo válido." }),
  roleId: z.string().uuid({ error: "Selecciona un rol." }),
  active: z.enum(["true", "false"]),
});

/**
 * Updates a profile's name/role/active flag and the auth user's email.
 * Admin-only. Uses the service_role key, so the caller's role MUST be
 * verified first via requireScreen.
 */
export async function updateUser(
  _prevState: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const profile = await requireScreen("admin.usuarios");

  const validatedFields = UpdateUserSchema.safeParse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
    active: formData.get("active") ?? "false",
  });

  if (!validatedFields.success) {
    return { error: "Revisa los datos del formulario." };
  }

  const { id, fullName, email, roleId, active } = validatedFields.data;

  if (id === profile.id && active === "false") {
    return { error: "No puedes desactivar tu propia cuenta." };
  }

  const admin = createAdminClient();

  // Mismo motivo que en createUser: sin este chequeo, un rol delegado con
  // "admin.usuarios" (pero sin ser Admin) podría asignarse a sí mismo (o a
  // cualquier cuenta) el rol Admin completo.
  const newRoleName = await getRoleName(admin, roleId);
  if (newRoleName === "Admin" && profile.role.name !== "Admin") {
    return { error: "Solo un Admin puede asignar el rol Admin." };
  }

  const { data: before } = await admin
    .from("profiles")
    .select("full_name, active, role:roles(name)")
    .eq("id", id)
    .single<{ full_name: string; active: boolean; role: { name: string } | { name: string }[] | null }>();
  const { data: beforeAuth } = await admin.auth.admin.getUserById(id);
  const beforeEmail = beforeAuth.user?.email ?? "";
  const beforeRoleName = Array.isArray(before?.role) ? before.role[0]?.name : before?.role?.name;

  const { error: profileError } = await admin
    .from("profiles")
    .update({ full_name: fullName, role_id: roleId, active: active === "true" })
    .eq("id", id);

  if (profileError) {
    return { error: profileError.message };
  }

  const { error: authError } = await admin.auth.admin.updateUserById(id, { email });

  if (authError) {
    return { error: authError.message };
  }

  if (before) {
    const afterRoleName = newRoleName;
    const isActive = active === "true";
    const changes: string[] = [];
    if (before.full_name !== fullName) changes.push(`Nombre: "${before.full_name}" → "${fullName}"`);
    if (beforeEmail && beforeEmail !== email) changes.push(`Correo: "${beforeEmail}" → "${email}"`);
    if (beforeRoleName && beforeRoleName !== afterRoleName) {
      changes.push(`Rol: "${beforeRoleName}" → "${afterRoleName}"`);
    }
    if (before.active !== isActive) {
      changes.push(`Estado: "${before.active ? "Activo" : "Inactivo"}" → "${isActive ? "Activo" : "Inactivo"}"`);
    }

    if (changes.length > 0) {
      await logAudit({
        tableName: "profiles",
        recordId: id,
        action: "update",
        summary: changes.join("; "),
        performedBy: profile,
      });
    }
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}
