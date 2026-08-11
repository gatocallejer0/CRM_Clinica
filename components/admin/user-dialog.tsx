"use client";

import { useActionState, useEffect } from "react";
import {
  createUser,
  updateUser,
  type UserFormState,
  type UserRow,
  type Role,
} from "@/app/actions/users";
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function UserDialog({
  open,
  onOpenChange,
  roles,
  user,
  isSelf,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  /** Si viene definido, el diálogo edita este usuario; si no, crea uno nuevo. */
  user?: UserRow;
  /** true si `user` es la cuenta con la que se inició sesión. */
  isSelf?: boolean;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const action = isEdit ? updateUser : createUser;
  const [state, formAction, pending] = useActionState<UserFormState, FormData>(
    action,
    undefined,
  );

  useEffect(() => {
    if (state?.success) {
      onSaved();
      onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.success]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos de acceso o el estado del usuario."
              : "Crea el acceso para un miembro del personal y asígnale un rol."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-col gap-4" key={user?.id ?? "create"}>
          {isEdit && <input type="hidden" name="id" value={user.id} />}

          <FormStagger className="flex flex-col gap-4">
            <Field label="Nombre completo" htmlFor="fullName" required>
              <Input id="fullName" name="fullName" defaultValue={user?.full_name} required />
            </Field>

            <Field label="Correo" htmlFor="email" required>
              <Input id="email" name="email" type="email" defaultValue={user?.email} required />
            </Field>

            {!isEdit && (
              <Field
                label="Contraseña temporal"
                htmlFor="password"
                required
                hint="Mínimo 8 caracteres"
              >
                <Input id="password" name="password" type="password" minLength={8} required />
              </Field>
            )}

            <Field label="Rol" htmlFor="roleId" required>
              <Select
                name="roleId"
                required
                defaultValue={user?.role?.id}
                items={Object.fromEntries(roles.map((role) => [role.id, role.name]))}
              >
                <SelectTrigger id="roleId" className="w-full">
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {isEdit && (
              <Field
                label="Estado"
                hint={
                  isSelf
                    ? "No puedes desactivar tu propia cuenta."
                    : "Desactivarla revoca su acceso sin eliminar la cuenta."
                }
              >
                <div className="flex items-center gap-2.5 rounded-lg border border-input bg-white/35 px-3.5 py-2.5">
                  <Switch
                    name="active"
                    value="true"
                    uncheckedValue="false"
                    defaultChecked={user.active}
                    disabled={isSelf}
                  />
                  <span className="text-sm text-foreground">Cuenta activa</span>
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
              {isEdit ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
