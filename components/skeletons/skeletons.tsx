import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Piezas de skeleton reutilizables para los `loading.tsx` de cada pantalla —
 * Next.js las muestra al instante (prefetched) apenas se hace clic en un
 * link del sidebar, mientras la pantalla de destino termina de cargar sus
 * datos. Así queda claro que el clic sí se registró.
 */

/** Buscador + tabla — pantallas de listado (Pacientes, Cobros, Usuarios, Auditoría, Roles). */
export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-10 w-32 shrink-0" />
      </div>
      <Card className="gap-0 p-0">
        <div className="flex items-center gap-4 border-b border-border px-5 py-3">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-5 py-4 last:border-b-0">
            {Array.from({ length: columns }).map((__, j) => (
              <Skeleton key={j} className={j === 0 ? "h-4 max-w-40 flex-1" : "h-4 flex-1"} />
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}

/** Grilla de tarjetas — Admin Center. */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-72" />
      <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="mb-2 size-10 rounded-xl" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-1.5 h-3 w-full" />
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}

/** Tarjeta con varios campos — pantallas de formulario o detalle (Ficha, Nuevo registro, Cuenta, Importar). */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-4 w-48" />
      <Card>
        <CardContent className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {Array.from({ length: fields }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

/** Barra de herramientas + calendario — Agenda. */
export function AgendaSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-14" />
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-16" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Card className="p-0">
        <Skeleton className="h-[540px] w-full rounded-2xl" />
      </Card>
    </div>
  );
}

/** KPIs + gráficas — Dashboard. */
export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="sm:col-span-2">
          <CardContent className="flex items-center gap-3.5 p-5">
            <Skeleton className="size-11 shrink-0 rounded-2xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3.5 p-5">
              <Skeleton className="size-11 shrink-0 rounded-2xl" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-14" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Skeleton className="h-5 w-40" />

      {[0, 1].map((row) => (
        <div key={row} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardContent className="p-5">
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <Skeleton className="h-56 w-full" />
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}
