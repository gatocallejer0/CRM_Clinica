import { requireRole } from "@/lib/auth/roles";
import {
  getOperationalReport,
  getPatientsSummaryReport,
  getPatientsDataReport,
  getAtRiskPatients,
  getAuditReport,
} from "@/app/actions/reports";
import { listAllServices } from "@/app/actions/catalog";
import { ReportesView } from "@/components/reportes/reportes-view";

const EMPTY_RANGE = { fromKey: null, toKey: null };

export default async function ReportesPage() {
  // Cada pestaña (Operativo, Pacientes, Auditoría) pedía sus datos recién en
  // el navegador, después de montar — de ahí el parpadeo "Cargando..." al
  // entrar a Reportes o cambiar de pestaña. Se piden aquí, del lado del
  // servidor, con los filtros por defecto (sin filtrar); cada componente
  // arranca con estos datos y solo vuelve a pedir al servidor cuando el
  // usuario cambia un filtro. requireRole corre junto al resto: las
  // consultas ya hacen su propio requireRole internamente y React cache()
  // comparte esa llamada.
  const [, services, operational, patientsSummary, atRiskPatients, patientsData, auditEntries] =
    await Promise.all([
      requireRole(["Admin"]),
      listAllServices(),
      getOperationalReport({ ...EMPTY_RANGE, status: "all", serviceId: null }),
      getPatientsSummaryReport(EMPTY_RANGE),
      getAtRiskPatients(),
      getPatientsDataReport(EMPTY_RANGE),
      getAuditReport(EMPTY_RANGE, null),
    ]);

  return (
    <ReportesView
      services={services}
      initialOperational={operational}
      initialPatientsSummary={patientsSummary}
      initialAtRiskPatients={atRiskPatients}
      initialPatientsData={patientsData}
      initialAuditEntries={auditEntries}
    />
  );
}
