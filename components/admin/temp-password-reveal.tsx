"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

function formatExpiry(expiresAt: string): string {
  return new Intl.DateTimeFormat("es-GT", {
    timeZone: "America/Guatemala",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(expiresAt));
}

/** Muestra una contraseña temporal generada por el sistema con botón de copiar. */
export function TempPasswordReveal({
  password,
  expiresAt,
}: {
  password: string;
  expiresAt?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <code className="flex-1 truncate rounded-lg bg-white/60 px-3 py-2 font-mono text-sm font-semibold tracking-wide text-foreground">
          {password}
        </code>
        <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <CheckIcon /> : <CopyIcon />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        {expiresAt
          ? `Válida hasta las ${formatExpiry(expiresAt)} (2 horas). Al iniciar sesión, se le pedirá elegir una contraseña propia.`
          : "Válida por 2 horas. Al iniciar sesión, se le pedirá elegir una contraseña propia."}
      </p>
    </div>
  );
}
