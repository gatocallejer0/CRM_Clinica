import { getGoogleCalendarStatus } from "@/app/actions/google-calendar";
import { GoogleCalendarCard } from "@/components/cuenta/google-calendar-card";
import { BackToAdminLink } from "@/components/admin/back-to-admin-link";

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ gcal?: string }>;
}) {
  const [status, { gcal }] = await Promise.all([getGoogleCalendarStatus(), searchParams]);

  return (
    <div className="flex flex-col gap-6">
      <BackToAdminLink />

      <GoogleCalendarCard status={status} initialMessage={gcal ?? null} />
    </div>
  );
}
