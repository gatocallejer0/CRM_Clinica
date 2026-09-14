import Link from "next/link";
import { CircleCheckIcon, TriangleAlertIcon } from "lucide-react";
import type { AtRiskPatientRow } from "@/app/actions/reports";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

export function AtRiskCard({
  patients,
  total,
  error,
}: {
  patients: AtRiskPatientRow[];
  total: number;
  error?: boolean;
}) {
  return (
    <Card className="gap-0 p-0">
      <CardHeader className="p-5">
        <CardTitle>Pacientes sin control reciente</CardTitle>
        <CardDescription>{error ? "No se pudo cargar esta lista." : "Sin cita en los últimos 90 días."}</CardDescription>
      </CardHeader>

      <CardContent className="px-0">
        {error ? (
          <EmptyState
            icon={TriangleAlertIcon}
            message="No se pudo cargar. Intenta recargar la página."
            tone="warning"
          />
        ) : patients.length === 0 ? (
          <EmptyState icon={CircleCheckIcon} message="Todas las pacientes tienen control reciente." tone="positive" />
        ) : (
          <div className="flex flex-col">
            {patients.map((p) => (
              <div
                key={p.patientId}
                className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 first:border-t-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{p.email || "Sin correo"}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold whitespace-nowrap text-muted-foreground">
                  {p.daysSinceLastVisit} días
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {total > patients.length && (
        <CardFooter className="justify-end bg-transparent px-5 pt-1 pb-5">
          <Link href="/reportes" className="text-sm font-semibold text-primary hover:underline">
            Ver las {total} en Reportes →
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
