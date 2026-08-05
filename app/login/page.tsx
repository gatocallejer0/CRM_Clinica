import { LoginForm } from "@/components/login-form";
import { AuthBackgroundBlobs } from "@/components/auth-background-blobs";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
      <AuthBackgroundBlobs />
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
