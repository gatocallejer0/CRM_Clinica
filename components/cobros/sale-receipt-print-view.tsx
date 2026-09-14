"use client";

import { useEffect } from "react";
import { PrinterIcon } from "lucide-react";
import type { SaleReceiptData } from "@/app/actions/catalog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { normalizeSpaces } from "@/lib/clinic-time";

const DATE_FORMAT = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" });

export function SaleReceiptPrintView({ data }: { data: SaleReceiptData }) {
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
            <p className="font-heading text-base font-bold">Recibo de pago</p>
            <p className="text-xs text-neutral-500">{normalizeSpaces(DATE_FORMAT.format(new Date(data.createdAt)))}</p>
          </div>
        </div>
        <Button type="button" variant="outline" className="print:hidden" onClick={() => window.print()}>
          <PrinterIcon className="size-4" />
          Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs font-medium text-neutral-500">Paciente</p>
          <p className="font-semibold">{data.patientName ?? "Venta sin paciente"}</p>
        </div>
        <div>
          <p className="text-xs font-medium text-neutral-500">Cobrado por</p>
          <p className="font-semibold">{data.soldByName}</p>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-left text-xs font-semibold tracking-wide text-neutral-500 uppercase">
              <th className="px-4 py-2.5">Concepto</th>
              <th className="px-4 py-2.5 text-right">Cant.</th>
              <th className="px-4 py-2.5 text-right">Precio</th>
              <th className="px-4 py-2.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, i) => (
              <tr key={i} className="border-b border-neutral-100 last:border-0">
                <td className="px-4 py-2.5">{item.product_name}</td>
                <td className="px-4 py-2.5 text-right">{item.quantity}</td>
                <td className="px-4 py-2.5 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="px-4 py-2.5 text-right font-medium">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <div className="flex w-56 items-center justify-between rounded-xl bg-neutral-50 px-4 py-3">
          <span className="text-sm font-semibold">Total</span>
          <span className="font-heading text-lg font-bold">{formatCurrency(data.total)}</span>
        </div>
      </div>

      {data.notes && (
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-neutral-500 uppercase">Notas</p>
          <p className="text-sm whitespace-pre-line text-neutral-700">{data.notes}</p>
        </div>
      )}

      <div className="mt-8 flex justify-end">
        <div className="w-56 border-t border-neutral-400 pt-1.5 text-center text-xs text-neutral-500">
          Recibido conforme
        </div>
      </div>
    </div>
  );
}
