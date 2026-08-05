import { requireRole } from "@/lib/auth/roles";
import { AppShell } from "@/components/app-shell/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole(["Admin", "Doctor", "Recepción"]);

  return <AppShell profile={profile}>{children}</AppShell>;
}
