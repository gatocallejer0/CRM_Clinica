"use server";

import * as z from "zod";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/roles";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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
  await requireRole(["Admin"]);
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
  await requireRole(["Admin"]);
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
  password: z
    .string()
    .min(8, { error: "La contraseña debe tener al menos 8 caracteres." }),
  roleId: z.string().uuid({ error: "Selecciona un rol." }),
});

export type CreateUserState =
  | {
      error?: string;
      success?: boolean;
    }
  | undefined;

/**
 * Creates a new auth user + profile row, assigning the given role.
 * Admin-only. Uses the service_role key (createAdminClient) which bypasses
 * RLS, so the caller's role MUST be verified first via requireRole.
 */
export async function createUser(
  _prevState: CreateUserState,
  formData: FormData,
): Promise<CreateUserState> {
  await requireRole(["Admin"]);

  const validatedFields = CreateUserSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    roleId: formData.get("roleId"),
  });

  if (!validatedFields.success) {
    return { error: "Revisa los datos del formulario." };
  }

  const { fullName, email, password, roleId } = validatedFields.data;
  const admin = createAdminClient();

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
  });

  if (profileError) {
    // Roll back the auth user so we don't leave an orphaned account.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/admin/usuarios");
  return { success: true };
}
