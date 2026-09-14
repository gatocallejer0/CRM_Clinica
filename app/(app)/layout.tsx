import { redirect } from "next/navigation";
import { requireActiveSession, getAllowedScreens } from "@/lib/auth/roles";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // requireActiveSession (no requireRole con lista fija): con roles
  // extensibles (Admin Center > Roles y permisos) ya no tiene sentido una
  // lista de 3 nombres acá — cada página de adentro valida su propia
  // pantalla con requireScreen.
  const profile = await requireActiveSession();

  // Contraseña temporal (recién creada o reemitida) pendiente de cambiar:
  // bloquea el resto de la app hasta que la actualice. /cambiar-password
  // vive fuera de este layout precisamente para no entrar en loop aquí.
  if (profile.temp_password_expires_at) {
    redirect("/cambiar-password");
  }

  const allowedScreens = [...(await getAllowedScreens(profile))];

  return (
    <AppShell profile={profile} allowedScreens={allowedScreens}>
      {children}
    </AppShell>
  );
}
