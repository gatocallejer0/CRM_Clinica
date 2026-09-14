import { requireScreen } from "@/lib/auth/roles";
import { getAuditReport } from "@/app/actions/reports";
import { AuditReportView } from "@/components/admin/audit-report";
import { BackToAdminLink } from "@/components/admin/back-to-admin-link";

const EMPTY_RANGE = { fromKey: null, toKey: null };

export default async function AuditoriaPage() {
  const [, entries] = await Promise.all([
    requireScreen("admin.auditoria"),
    getAuditReport(EMPTY_RANGE, null),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <BackToAdminLink />
      <AuditReportView initialEntries={entries} />
    </div>
  );
}
