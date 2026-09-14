import { ShieldOffIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Destino de reserva cuando requireScreen()/requireActiveSession() necesitan
 * redirigir pero el perfil ni siquiera tiene la pantalla "dashboard" (rol
 * personalizado sin pantallas asignadas, o cuenta inactiva) — sin esto,
 * redirigir a "/" haría que el propio Dashboard se redirigiera a sí mismo en
 * bucle. No pide ninguna pantalla: cualquier sesión activa la puede ver, y el
 * sidebar de al lado ya muestra las pantallas reales que sí tiene el rol.
 */
export default function SinAccesoPage() {
  return (
    <Card className="mx-auto max-w-md">
      <EmptyState
        icon={ShieldOffIcon}
        message="Tu rol todavía no tiene ninguna pantalla asignada. Pide a un administrador que te dé acceso desde Admin Center > Roles y permisos."
      />
    </Card>
  );
}
