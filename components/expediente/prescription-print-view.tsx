"use client";

import { useEffect } from "react";
import { PrinterIcon } from "lucide-react";
import type { PrescriptionPrintData } from "@/app/actions/clinical-records";
import { Button } from "@/components/ui/button";
import { formatDateEs } from "./clinical-utils";

export function PrescriptionPrintView({ data }: { data: PrescriptionPrintData }) {
  useEffect(() => {
    const id = setTimeout(() => window.print(), 300);
    return () => clearTimeout(id);
  }, []);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col gap-6 bg-white px-8 py-10 text-neutral-900 print:px-0 print:py-0">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="size-11 shrink-0 rounded-xl bg-white"
            style={{
              backgroundImage: "url(/logo-icon.png)",
              backgroundSize: "contain",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }}
          />
          <div>
            <p className="font-heading text-base font-bold">Receta médica</p>
            <p className="text-xs text-neutral-500">{formatDateEs(data.recordDate)}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          className="print:hidden"
          onClick={() => window.print()}
        >
          <PrinterIcon className="size-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-neutral-500">Paciente</p>
          <p className="font-semibold">{data.patientName}</p>
        </div>
        {data.doctorName && (
          <div>
            <p className="text-xs font-medium text-neutral-500">Doctora</p>
            <p className="font-semibold">{data.doctorName}</p>
          </div>
        )}
      </div>

      <div className="flex-1 rounded-xl border border-neutral-200 p-5">
        <p className="mb-2 text-xs font-semibold tracking-wide text-neutral-500 uppercase">
          Indicaciones
        </p>
        <p className="text-sm leading-relaxed whitespace-pre-line">{data.prescription}</p>
      </div>

      <div className="mt-8 flex justify-end">
        <div className="w-56 border-t border-neutral-400 pt-1.5 text-center text-xs text-neutral-500">
          Firma y sello
        </div>
      </div>
    </div>
  );
}
