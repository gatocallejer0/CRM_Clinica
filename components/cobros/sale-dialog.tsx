"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, Trash2Icon } from "lucide-react";
import {
  createSale,
  type CatalogFormState,
  type ProductRow,
  type ServiceRow,
} from "@/app/actions/catalog";
import type { PatientOption } from "@/app/actions/appointments";
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
import { PAYMENT_METHOD_LABELS } from "./sale-meta";
import type { PaymentMethod } from "@/app/actions/catalog";

type ItemKind = "product" | "service";
type Line = { key: string; kind: ItemKind; itemId: string; quantity: string; unitPrice: string };

function emptyLine(): Line {
  return { key: crypto.randomUUID(), kind: "product", itemId: "", quantity: "1", unitPrice: "" };
}

export function SaleDialog({
  open,
  onOpenChange,
  products,
  services,
  initialPatient,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: ProductRow[];
  services: ServiceRow[];
  initialPatient?: PatientOption;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState<CatalogFormState, FormData>(
    createSale,
    undefined,
  );
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const activeServices = useMemo(() => services.filter((s) => s.active), [services]);
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const serviceById = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

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

  function handleKindChange(key: string, kind: ItemKind) {
    updateLine(key, { kind, itemId: "", unitPrice: "" });
  }

  function handleItemChange(key: string, kind: ItemKind, itemId: string) {
    const price = kind === "product" ? productById.get(itemId)?.price : serviceById.get(itemId)?.price;
    updateLine(key, { itemId, unitPrice: price != null ? String(price) : "0" });
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
      .filter((l) => l.itemId && Number(l.quantity) > 0)
      .map((l) => ({
        productId: l.kind === "product" ? l.itemId : undefined,
        serviceId: l.kind === "service" ? l.itemId : undefined,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice) || 0,
      })),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nueva venta</DialogTitle>
          <DialogDescription>
            Registra productos y/o servicios cobrados — el stock de productos se descuenta automáticamente.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4" key={initialPatient?.id ?? "new"}>
          <input type="hidden" name="items" value={itemsJson} />

          <FormStagger className="flex flex-col gap-4">
            <Field
              label="Paciente"
              htmlFor="patientId"
              hint={initialPatient ? undefined : "Opcional — dejar vacío si no aplica"}
            >
              {initialPatient ? (
                <div className="flex h-10 items-center gap-2 rounded-lg border border-input bg-muted/40 px-3.5 text-sm">
                  <input type="hidden" name="patientId" value={initialPatient.id} />
                  <span className="font-medium text-foreground">{initialPatient.full_name}</span>
                  {initialPatient.email && (
                    <span className="truncate text-xs text-muted-foreground">{initialPatient.email}</span>
                  )}
                </div>
              ) : (
                <PatientSearchField
                  name="patientId"
                  required={false}
                  placeholder="Buscar paciente (opcional)..."
                />
              )}
            </Field>

            <Field label="Productos y servicios" required>
              <div className="flex flex-col gap-2.5">
                {lines.map((line) => {
                  const items = line.kind === "product" ? activeProducts : activeServices;
                  const itemById = line.kind === "product" ? productById : serviceById;
                  const product = line.kind === "product" ? productById.get(line.itemId) : undefined;
                  const qty = Number(line.quantity);
                  const insufficientStock =
                    product && Number.isFinite(qty) && qty > product.stock;

                  return (
                    <div key={line.key} className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex shrink-0 rounded-lg border border-input bg-white/35 p-0.5">
                          {(["product", "service"] as ItemKind[]).map((k) => (
                            <button
                              key={k}
                              type="button"
                              onClick={() => handleKindChange(line.key, k)}
                              className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                                line.kind === k
                                  ? "bg-primary/10 text-primary"
                                  : "text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              {k === "product" ? "Producto" : "Servicio"}
                            </button>
                          ))}
                        </div>
                        <Combobox
                          items={items.map((i) => i.id)}
                          value={line.itemId || null}
                          onValueChange={(value) => handleItemChange(line.key, line.kind, value ?? "")}
                          itemToStringLabel={(id: string) => itemById.get(id)?.name ?? ""}
                        >
                          <ComboboxInputGroup className="min-w-[180px] flex-1">
                            <ComboboxInput
                              placeholder={line.kind === "product" ? "Busca un producto..." : "Busca un servicio..."}
                            />
                            <ComboboxClear />
                            <ComboboxTrigger />
                          </ComboboxInputGroup>
                          <ComboboxPopup>
                            <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                            <ComboboxList>
                              {(id: string) => {
                                if (line.kind === "product") {
                                  const p = productById.get(id);
                                  return (
                                    <ComboboxItem key={id} value={id}>
                                      {p?.name}
                                      <span className="ml-1.5 text-xs text-muted-foreground">
                                        stock: {p?.stock} {p?.unit}
                                      </span>
                                    </ComboboxItem>
                                  );
                                }
                                const s = serviceById.get(id);
                                return (
                                  <ComboboxItem key={id} value={id}>
                                    {s?.name}
                                  </ComboboxItem>
                                );
                              }}
                            </ComboboxList>
                          </ComboboxPopup>
                        </Combobox>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          value={line.quantity}
                          onChange={(e) =>
                            updateLine(line.key, { quantity: e.target.value.replace(/[^0-9]/g, "") })
                          }
                          className="w-20 shrink-0"
                          aria-label="Cantidad"
                        />
                        <div
                          className="flex h-10 w-28 shrink-0 items-center justify-end rounded-lg border border-input bg-muted/40 px-2.5 text-sm font-medium text-foreground"
                          aria-label="Precio unitario"
                        >
                          {formatCurrency(Number(line.unitPrice) || 0)}
                        </div>
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
                Agregar línea
              </Button>
            </Field>

            <Field label="Método de pago" htmlFor="paymentMethod" required>
              <Combobox
                items={Object.keys(PAYMENT_METHOD_LABELS)}
                itemToStringLabel={(v: string) => PAYMENT_METHOD_LABELS[v as PaymentMethod] ?? v}
                name="paymentMethod"
                required
              >
                <ComboboxInputGroup>
                  <ComboboxInput id="paymentMethod" placeholder="¿Cómo pagó?" />
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
