import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/roles";
import { ChangePasswordForm } from "@/components/change-password-form";
import { AuthBackgroundBlobs } from "@/components/auth-background-blobs";

export default async function CambiarPasswordPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.temp_password_expires_at) redirect("/");

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <AuthBackgroundBlobs />
      <ChangePasswordForm />
    </div>
  );
}
