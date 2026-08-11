"use client";

import { useActionState, useEffect } from "react";
import {
  createService,
  updateService,
  type CatalogFormState,
  type ServiceRow,
} from "@/app/actions/catalog";
import { CATEGORY_LABELS } from "@/components/agenda/appointment-meta";
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
import { Field, FieldRow, FormStagger } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
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

export function ServiceDialog({
  open,
  onOpenChange,
  service,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si viene definido, el diálogo edita este servicio; si no, crea uno nuevo. */
  service?: ServiceRow;
  onSaved: () => void;
}) {
  const isEdit = !!service;
  const action = isEdit ? updateService : createService;
  const [state, formAction, pending] = useActionState<CatalogFormState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      onSaved();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos del servicio o su disponibilidad en Agenda."
              : "Agrega un servicio al catálogo que Agenda puede agendar."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4" key={service?.id ?? "create"}>
          {isEdit && <input type="hidden" name="id" value={service.id} />}

          <FormStagger className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="name" required>
              <Input id="name" name="name" defaultValue={service?.name} required />
            </Field>

            <FieldRow>
              <Field label="Categoría" htmlFor="category" required>
                <Combobox
                  items={Object.keys(CATEGORY_LABELS)}
                  defaultValue={service?.category ?? "general"}
                  itemToStringLabel={(v: string) => CATEGORY_LABELS[v as keyof typeof CATEGORY_LABELS] ?? v}
                  name="category"
                  required
                >
                  <ComboboxInputGroup>
                    <ComboboxInput id="category" />
                    <ComboboxTrigger />
                  </ComboboxInputGroup>
                  <ComboboxPopup>
                    <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                    <ComboboxList>
                      {(v: string) => (
                        <ComboboxItem key={v} value={v}>
                          {CATEGORY_LABELS[v as keyof typeof CATEGORY_LABELS]}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxPopup>
                </Combobox>
              </Field>

              <Field label="Duración (min)" htmlFor="durationMinutes" required>
                <Input
                  id="durationMinutes"
                  name="durationMinutes"
                  type="number"
                  min={5}
                  step={5}
                  defaultValue={service?.duration_minutes ?? 30}
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
                defaultValue={service?.price ?? undefined}
              />
            </Field>

            {isEdit && (
              <Field
                label="Estado"
                hint="Un servicio inactivo deja de aparecer en el selector de Agenda."
              >
                <div className="flex items-center gap-2.5 rounded-lg border border-input bg-white/35 px-3.5 py-2.5">
                  <Switch
                    name="active"
                    value="true"
                    uncheckedValue="false"
                    defaultChecked={service.active}
                  />
                  <span className="text-sm text-foreground">Servicio activo</span>
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
              {isEdit ? "Guardar cambios" : "Crear servicio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
