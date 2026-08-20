"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import {
  createProduct,
  updateProduct,
  type CatalogFormState,
  type ProductRow,
} from "@/app/actions/catalog";
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
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FieldRow, FormStagger } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

export function ProductDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si viene definido, el diálogo edita este producto; si no, crea uno nuevo. */
  product?: ProductRow;
  onSaved: () => void;
}) {
  const isEdit = !!product;
  const action = isEdit ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState<CatalogFormState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      toast.success(isEdit ? "Producto actualizado" : "Producto creado");
      onSaved();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos del producto. Los cambios de stock también quedan en el historial."
              : "Agrega un producto o insumo al inventario."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4" key={product?.id ?? "create"}>
          {isEdit && <input type="hidden" name="id" value={product.id} />}

          <FormStagger className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="name" required>
              <Input id="name" name="name" defaultValue={product?.name} required />
            </Field>

            <Field label="Descripción" htmlFor="description" hint="Opcional">
              <Textarea
                id="description"
                name="description"
                defaultValue={product?.description ?? ""}
                className="min-h-16"
              />
            </Field>

            <FieldRow className="grid-cols-2">
              <Field label="Unidad de medida" htmlFor="unit" required hint='Ej. "caja", "unidad", "ml"'>
                <Input id="unit" name="unit" defaultValue={product?.unit ?? "unidad"} required />
              </Field>

              <Field label="Stock" htmlFor="stock" required>
                <Input
                  id="stock"
                  name="stock"
                  type="number"
                  min={0}
                  step="0.01"
                  defaultValue={product?.stock ?? 0}
                  required
                />
              </Field>
            </FieldRow>

            <Field label="Precio" htmlFor="price" hint="Opcional">
              <Input
                id="price"
                name="price"
                type="number"
                min={0}
                step="0.01"
                defaultValue={product?.price ?? undefined}
              />
            </Field>

            <Field label="Imagen" htmlFor="imageUrl" hint="URL de la imagen, opcional">
              <Input
                id="imageUrl"
                name="imageUrl"
                type="url"
                placeholder="https://..."
                defaultValue={product?.image_url ?? ""}
              />
            </Field>

            {isEdit && (
              <Field
                label="Estado"
                hint="Un producto inactivo deja de aparecer al registrar una venta."
              >
                <div className="flex items-center gap-2.5 rounded-lg border border-input bg-white/35 px-3.5 py-2.5">
                  <Switch
                    name="active"
                    value="true"
                    uncheckedValue="false"
                    defaultChecked={product.active}
                  />
                  <span className="text-sm text-foreground">Producto activo</span>
                </div>
              </Field>
            )}
          </FormStagger>

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
              {isEdit ? "Guardar cambios" : "Crear producto"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
