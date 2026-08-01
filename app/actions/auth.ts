"use server";

import { redirect } from "next/navigation";
import * as z from "zod";
import { createClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  email: z.email({ error: "Ingresa un correo válido." }),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
  redirectTo: z.string().optional(),
});

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

  const { email, password, redirectTo } = validatedFields.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "Correo o contraseña incorrectos." };
  }

  redirect(redirectTo && redirectTo.startsWith("/") ? redirectTo : "/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
