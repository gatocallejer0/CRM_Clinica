"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { createRole, updateRole, type RoleFormState, type RoleRow } from "@/app/actions/roles";
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

export function RoleDialog({
  open,
  onOpenChange,
  role,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Si viene definido, el diálogo edita este rol; si no, crea uno nuevo. */
  role?: RoleRow;
  onSaved: () => void;
}) {
  const isEdit = !!role;
  const action = isEdit ? updateRole : createRole;
  const [state, formAction, pending] = useActionState<RoleFormState, FormData>(action, undefined);

  useEffect(() => {
    if (state?.success) {
      toast.success(isEdit ? "Rol actualizado" : "Rol creado");
      onSaved();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar rol" : "Nuevo rol"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza el nombre o la descripción del rol."
              : 'Crea un rol nuevo. Empieza sin pantallas habilitadas — se las asignas después desde "Permisos".'}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4" key={role?.id ?? "create"}>
          {isEdit && <input type="hidden" name="id" value={role.id} />}

          <FormStagger className="flex flex-col gap-4">
            <Field label="Nombre" htmlFor="name" required>
              <Input id="name" name="name" defaultValue={role?.name} required />
            </Field>

            <Field label="Descripción" htmlFor="description" hint="Opcional">
              <Input id="description" name="description" defaultValue={role?.description ?? ""} />
            </Field>
          </FormStagger>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
            <Button type="submit" disabled={pending} loading={pending}>
              {isEdit ? "Guardar cambios" : "Crear rol"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
