"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { rateLimit, getClientIp, RateLimitError } from "@/lib/rate-limit";
import { newPasswordSchema } from "@/lib/password";

const LoginSchema = z.object({
  email: z.email({ error: "Ingresa un correo válido." }),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
  redirectTo: z.string().optional(),
});

// `startsWith("/")` solo no alcanza: "//evil.example" también empieza con
// "/" pero el navegador lo trata como URL absoluta (protocol-relative) hacia
// otro host — exactamente lo que dejaba usar este redirect para phishing
// post-login. Se exige que después del primer "/" no venga otro "/" ni un
// "\" (algunos navegadores normalizan "\" a "/", así que "/\evil.example"
// cuela por la misma vía si no se bloquea también).
const SAFE_REDIRECT_PATTERN = /^\/(?!\/|\\)/;

export type LoginState =
  | {
      error?: string;
    }
  | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const validatedFields = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    redirectTo: formData.get("redirectTo") ?? undefined,
  });

  if (!validatedFields.success) {
    return { error: "Revisa el correo y la contraseña." };
  }

  try {
    rateLimit(`login:${await getClientIp()}`, { limit: 10, windowMs: 5 * 60_000 });
  } catch (err) {
    if (err instanceof RateLimitError) return { error: err.message };
    throw err;
  }

  const { email, password, redirectTo } = validatedFields.data;
  const supabase = await createClient();

  const { data: signedIn, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("[login] Supabase signInWithPassword error:", error.status, error.message);
    return { error: "Correo o contraseña incorrectos." };
  }

  // Se usa el admin client porque `profiles` no tiene policy de UPDATE para
  // `authenticated` (ver 0001_init.sql) — solo lectura del propio perfil.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("temp_password_expires_at")
    .eq("id", signedIn.user.id)
    .single<{ temp_password_expires_at: string | null }>();

  if (profile?.temp_password_expires_at) {
    if (new Date(profile.temp_password_expires_at) < new Date()) {
      await supabase.auth.signOut();
      return { error: "Tu contraseña temporal expiró. Pide a un administrador que genere una nueva." };
    }

    // Contraseña temporal aún vigente: se le permite entrar, pero queda
    // forzado a elegir una contraseña propia antes de usar el resto de la
    // app (ver app/(app)/layout.tsx, que redirige mientras este campo siga
    // sin ser null).
    redirect("/cambiar-password");
  }

  redirect(redirectTo && SAFE_REDIRECT_PATTERN.test(redirectTo) ? redirectTo : "/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

const ChangePasswordSchema = z
  .object({
    password: newPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export type ChangePasswordState =
  | {
      error?: string;
    }
  | undefined;

/**
 * Reemplaza la contraseña temporal por una elegida por el propio usuario.
 * Requiere sesión activa (se llega aquí forzado desde el login o el layout
 * de la app mientras `profiles.temp_password_expires_at` no sea null).
 */
export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const validatedFields = ChangePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!validatedFields.success) {
    return { error: validatedFields.error.issues[0]?.message ?? "Revisa la contraseña." };
  }

  const { error } = await supabase.auth.updateUser({ password: validatedFields.data.password });
  if (error) {
    return { error: error.message };
  }

  // Se usa el admin client porque `profiles` no tiene policy de UPDATE para
  // `authenticated` (ver 0001_init.sql).
  const admin = createAdminClient();
  await admin.from("profiles").update({ temp_password_expires_at: null }).eq("id", user.id);

  redirect("/");
}
