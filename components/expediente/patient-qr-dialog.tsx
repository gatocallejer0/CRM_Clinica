"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function PatientQrDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const registrationUrl = open && typeof window !== "undefined" ? `${window.location.origin}/registro-paciente` : "";

  useEffect(() => {
    if (!registrationUrl) return;
    QRCode.toDataURL(registrationUrl, { width: 320, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [registrationUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Registro de paciente</DialogTitle>
          <DialogDescription>
            Escanea este código con tu celular para llenar la ficha de registro.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrDataUrl}
              alt="Código QR para registro de paciente"
              className="size-64 rounded-xl border border-border"
            />
          ) : (
            <div className="flex size-64 items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
              Generando código…
            </div>
          )}
          <p className="text-center text-xs break-all text-muted-foreground">{registrationUrl}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
