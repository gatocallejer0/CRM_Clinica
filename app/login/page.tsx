import { LoginForm } from "@/components/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <LoginForm redirectTo={redirectTo} />
    </div>
  );
}
