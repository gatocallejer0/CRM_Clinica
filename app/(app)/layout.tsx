import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/roles";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["Admin", "Doctor", "Recepción"]);

  // Contraseña temporal (recién creada o reemitida) pendiente de cambiar:
  // bloquea el resto de la app hasta que la actualice. /cambiar-password
  // vive fuera de este layout precisamente para no entrar en loop aquí.
  if (profile.temp_password_expires_at) {
    redirect("/cambiar-password");
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
