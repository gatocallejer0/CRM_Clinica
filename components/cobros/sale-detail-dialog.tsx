"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  updateSaleStatus,
  type CatalogFormState,
  type PaymentMethod,
  type SaleRow,
  type SaleStatus,
} from "@/app/actions/catalog";
import { normalizeSpaces } from "@/lib/clinic-time";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FormStagger } from "@/components/ui/field";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxTrigger,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { formatCurrency } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, SALE_STATUS_LABELS } from "./sale-meta";

const DATE_FORMAT = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short" });

export function SaleDetailDialog({
  sale,
  open,
  onOpenChange,
  onSaved,
}: {
  sale: SaleRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<CatalogFormState, FormData>(
    updateSaleStatus,
    undefined,
  );
  // cobros-view.tsx monta este componente con key={selectedSale?.id}, así
  // que este estado (y el de useActionState arriba) se reinicia solo cada
  // vez que se abre una venta distinta — igual que AppointmentDialog con
  // dialogKey en agenda-view.tsx.
  const [status, setStatus] = useState<SaleStatus>(sale?.status ?? "pagado");

  useEffect(() => {
    if (state?.success) {
      toast.success("Estado actualizado");
      onSaved();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!sale) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{sale.patient_name ?? "Venta sin paciente"}</DialogTitle>
          <DialogDescription>
            {normalizeSpaces(DATE_FORMAT.format(new Date(sale.created_at)))} · Vendido por {sale.sold_by_name}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4" key={sale.id}>
          <input type="hidden" name="saleId" value={sale.id} />

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-0">Producto / servicio</TableHead>
                <TableHead>Cant.</TableHead>
                <TableHead className="pr-0 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  <TableCell className="pl-0">{item.product_name}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell className="pr-0 text-right">{formatCurrency(item.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between rounded-lg border border-input bg-white/35 px-3.5 py-2.5">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="font-heading text-lg font-bold text-foreground">
              {formatCurrency(sale.total)}
            </span>
          </div>

          {sale.notes && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Notas: </span>
              {sale.notes}
            </p>
          )}

          <FormStagger className="flex flex-col gap-4">
            <Field label="Estado" htmlFor="status">
              <Combobox
                items={Object.keys(SALE_STATUS_LABELS)}
                defaultValue={sale.status}
                onValueChange={(v) => setStatus((v as SaleStatus) ?? sale.status)}
                itemToStringLabel={(v: string) => SALE_STATUS_LABELS[v as keyof typeof SALE_STATUS_LABELS] ?? v}
                name="status"
              >
                <ComboboxInputGroup>
                  <ComboboxInput id="status" />
                  <ComboboxTrigger />
                </ComboboxInputGroup>
                <ComboboxPopup>
                  <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                  <ComboboxList>
                    {(v: string) => (
                      <ComboboxItem key={v} value={v}>
                        {SALE_STATUS_LABELS[v as keyof typeof SALE_STATUS_LABELS]}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
            </Field>

            {status === "pagado" && (
              <Field label="Método de pago" htmlFor="paymentMethod" required>
                <Combobox
                  items={Object.keys(PAYMENT_METHOD_LABELS)}
                  defaultValue={sale.payment_method ?? undefined}
                  itemToStringLabel={(v: string) => PAYMENT_METHOD_LABELS[v as PaymentMethod] ?? v}
                  name="paymentMethod"
                  required
                >
                  <ComboboxInputGroup>
                    <ComboboxInput id="paymentMethod" placeholder="¿Cómo se pagó?" />
                    <ComboboxTrigger />
                  </ComboboxInputGroup>
                  <ComboboxPopup>
                    <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                    <ComboboxList>
                      {(v: string) => (
                        <ComboboxItem key={v} value={v}>
                          {PAYMENT_METHOD_LABELS[v as PaymentMethod]}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </Field>
            )}
          </FormStagger>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cerrar</DialogClose>
            <Button type="submit" disabled={pending} loading={pending}>
              Guardar estado
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
