"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarIcon } from "lucide-react";
import { disconnectGoogleCalendar, type GoogleCalendarStatus } from "@/app/actions/google-calendar";
import { Card } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const MESSAGES: Record<string, { error?: boolean; text: string }> = {
  conectado: { text: "Google Calendar conectado correctamente." },
  denegado: { error: true, text: "No se completó la conexión — se canceló el permiso en Google." },
  error: { error: true, text: "No se pudo conectar con Google Calendar. Intenta de nuevo." },
  sin_permiso_calendario: {
    error: true,
    text: "Google no otorgó el permiso de Calendario — revisa que el scope de Calendar esté agregado en la pantalla de consentimiento de Google Cloud Console, y vuelve a intentar.",
  },
};

export function GoogleCalendarCard({
  status,
  initialMessage,
}: {
  status: GoogleCalendarStatus;
  initialMessage: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!initialMessage) return;
    const message = MESSAGES[initialMessage];
    if (message) {
      if (message.error) toast.error(message.text);
      else toast.success(message.text);
    }
    router.replace("/cuenta");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleDisconnect() {
    startTransition(async () => {
      const result = await disconnectGoogleCalendar();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setConfirming(false);
      toast.success("Google Calendar desconectado.");
      router.refresh();
    });
  }

  return (
    <Card className="max-w-lg p-6">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <CalendarIcon className="size-5 text-primary" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-heading text-sm font-semibold text-foreground">Google Calendar</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Con tu cuenta conectada, cada cita que se agende, edite o cancele en la Agenda se refleja
            automáticamente en tu Google Calendar.
          </p>

          <div className="mt-4">
            {status.connected ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge
                  variant="outline"
                  className="border-transparent"
                  style={{ color: "var(--status-confirmed-fg)", backgroundColor: "var(--status-confirmed-bg)" }}
                >
                  Conectado{status.googleEmail ? ` — ${status.googleEmail}` : ""}
                </Badge>
                {confirming ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      onClick={handleDisconnect}
                    >
                      Confirmar
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" size="sm" onClick={() => setConfirming(true)}>
                    Desconectar
                  </Button>
                )}
              </div>
            ) : (
              <a href="/api/google-calendar/connect" className={buttonVariants({ size: "sm" })}>
                Conectar Google Calendar
              </a>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
