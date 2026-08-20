"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { createSale, type CatalogFormState, type ProductRow } from "@/app/actions/catalog";
import { PatientSearchField } from "@/components/agenda/patient-search-field";
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
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FormStagger } from "@/components/ui/field";
import {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxClear,
  ComboboxTrigger,
  ComboboxPopup,
  ComboboxList,
  ComboboxItem,
  ComboboxEmpty,
} from "@/components/ui/combobox";
import { formatCurrency } from "@/lib/format";

type Line = { key: string; productId: string; quantity: string; unitPrice: string };

function emptyLine(): Line {
  return { key: crypto.randomUUID(), productId: "", quantity: "1", unitPrice: "" };
}

export function SaleDialog({
  open,
  onOpenChange,
  products,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductRow[];
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<CatalogFormState, FormData>(
    createSale,
    undefined,
  );
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  useEffect(() => {
    if (state?.success) {
      toast.success("Venta registrada");
      onSaved();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function handleProductChange(key: string, productId: string) {
    const product = productById.get(productId);
    updateLine(key, {
      productId,
      unitPrice: product?.price != null ? String(product.price) : "0",
    });
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.key !== key) : prev));
  }

  const total = lines.reduce((sum, l) => {
    const qty = Number(l.quantity);
    const price = Number(l.unitPrice);
    return sum + (Number.isFinite(qty) && Number.isFinite(price) ? qty * price : 0);
  }, 0);

  const itemsJson = JSON.stringify(
    lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice) || 0,
      })),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nueva venta</DialogTitle>
          <DialogDescription>
            Registra productos vendidos — el stock se descuenta automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="items" value={itemsJson} />

          <FormStagger className="flex flex-col gap-4">
            <Field label="Paciente" htmlFor="patientId" hint="Opcional — dejar vacío si no aplica">
              <PatientSearchField
                name="patientId"
                required={false}
                placeholder="Buscar paciente (opcional)..."
              />
            </Field>

            <Field label="Productos" required>
              <div className="flex flex-col gap-2.5">
                {lines.map((line) => {
                  const product = productById.get(line.productId);
                  const qty = Number(line.quantity);
                  const insufficientStock =
                    product && Number.isFinite(qty) && qty > product.stock;

                  return (
                    <div key={line.key} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Combobox
                          items={activeProducts.map((p) => p.id)}
                          value={line.productId || null}
                          onValueChange={(value) => handleProductChange(line.key, value ?? "")}
                          itemToStringLabel={(id: string) => productById.get(id)?.name ?? ""}
                        >
                          <ComboboxInputGroup className="flex-1">
                            <ComboboxInput placeholder="Busca un producto..." />
                            <ComboboxClear />
                            <ComboboxTrigger />
                          </ComboboxInputGroup>
                          <ComboboxPopup>
                            <ComboboxEmpty>Sin productos que coincidan.</ComboboxEmpty>
                            <ComboboxList>
                              {(id: string) => {
                                const p = productById.get(id);
                                return (
                                  <ComboboxItem key={id} value={id}>
                                    {p?.name}
                                    <span className="ml-1.5 text-xs text-muted-foreground">
                                      stock: {p?.stock} {p?.unit}
                                    </span>
                                  </ComboboxItem>
                                );
                              }}
                            </ComboboxList>
                          </ComboboxPopup>
                        </Combobox>
                        <Input
                          type="number"
                          min={0.01}
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                          className="w-20 shrink-0"
                          aria-label="Cantidad"
                        />
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={line.unitPrice}
                          onChange={(e) => updateLine(line.key, { unitPrice: e.target.value })}
                          className="w-24 shrink-0"
                          aria-label="Precio unitario"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeLine(line.key)}
                          disabled={lines.length === 1}
                          title="Quitar línea"
                        >
                          <Trash2Icon className="size-4" />
                        </Button>
                      </div>
                      {insufficientStock && (
                        <p className="text-xs font-medium text-destructive">
                          Solo hay {product.stock} {product.unit} en stock.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="mt-1 self-start"
              >
                <PlusIcon className="size-3.5" />
                Agregar producto
              </Button>
            </Field>

            <Field label="Notas" htmlFor="notes" hint="Opcional">
              <Input id="notes" name="notes" />
            </Field>
          </FormStagger>

          <div className="flex items-center justify-between rounded-lg border border-input bg-white/35 px-3.5 py-2.5">
            <span className="text-sm font-medium text-foreground">Total</span>
            <span className="font-heading text-lg font-bold text-foreground">
              {formatCurrency(total)}
            </span>
          </div>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancelar
            </DialogClose>
            <Button type="submit" disabled={pending} loading={pending}>
              Registrar venta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
