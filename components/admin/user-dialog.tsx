"use client";

import { useActionState, useEffect, useMemo } from "react";
import {
  createUser,
  updateUser,
  resetUserPassword,
  type UserFormState,
  type ResetPasswordState,
  type UserRow,
  type Role,
} from "@/app/actions/users";
import { TempPasswordReveal } from "./temp-password-reveal";
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
  const [resetState, resetAction, resetPending] = useActionState<ResetPasswordState, FormData>(
    resetUserPassword,
    undefined,
  );
  const roleNameById = useMemo(() => new Map(roles.map((role) => [role.id, role.name])), [roles]);

  const justCreatedWithPassword = !isEdit && state?.success && state.generatedPassword;

  useEffect(() => {
    if (state?.success) {
      onSaved();
      // El diálogo de creación se queda abierto para mostrar la contraseña
      // temporal generada; el usuario lo cierra con "Listo".
      if (isEdit) onOpenChange(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (justCreatedWithPassword) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Usuario creado</DialogTitle>
            <DialogDescription>
              Comparte esta contraseña temporal con el nuevo colaborador; solo se muestra una vez.
            </DialogDescription>
          </DialogHeader>

          <TempPasswordReveal password={state.generatedPassword!} expiresAt={state.passwordExpiresAt} />

          <DialogFooter>
            <Button type="button" onClick={() => onOpenChange(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

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
              <p className="text-xs text-muted-foreground">
                El sistema genera una contraseña temporal (válida por 2 horas) al crear el usuario.
              </p>
            )}

            <Field label="Rol" htmlFor="roleId" required>
              <Combobox
                items={roles.map((role) => role.id)}
                defaultValue={user?.role?.id ?? null}
                itemToStringLabel={(id: string) => roleNameById.get(id) ?? ""}
                name="roleId"
                required
              >
                <ComboboxInputGroup>
                  <ComboboxInput id="roleId" placeholder="Busca un rol..." />
                  <ComboboxClear />
                  <ComboboxTrigger />
                </ComboboxInputGroup>
                <ComboboxPopup>
                  <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
                  <ComboboxList>
                    {(id: string) => (
                      <ComboboxItem key={id} value={id}>
                        {roleNameById.get(id)}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxPopup>
              </Combobox>
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

        {isEdit && (
          <div className="flex flex-col gap-2.5 border-t border-border pt-4">
            {resetState?.password ? (
              <TempPasswordReveal password={resetState.password} expiresAt={resetState.passwordExpiresAt} />
            ) : (
              <form action={resetAction} className="flex items-center justify-between gap-3">
                <input type="hidden" name="id" value={user.id} />
                <div>
                  <p className="text-sm font-medium text-foreground">Restablecer contraseña</p>
                  <p className="text-xs text-muted-foreground">
                    Si olvidó su contraseña o la temporal expiró sin usarla, genera una nueva.
                  </p>
                </div>
                <Button type="submit" variant="outline" size="sm" disabled={resetPending} loading={resetPending}>
                  Generar nueva
                </Button>
              </form>
            )}
            {resetState?.error && (
              <Alert variant="destructive">
                <AlertDescription>{resetState.error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
