import { requireRole } from "@/lib/auth/roles";
import { ReportesView } from "@/components/reportes/reportes-view";

export default async function ReportesPage() {
  await requireRole(["Admin"]);

  return <ReportesView />;
}
