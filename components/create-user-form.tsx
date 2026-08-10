"use client";

import { useActionState } from "react";
import { createUser, type CreateUserState, type Role } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FormStagger } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function CreateUserForm({ roles }: { roles: Role[] }) {
  const [state, action, pending] = useActionState<CreateUserState, FormData>(
    createUser,
    undefined,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nuevo usuario</CardTitle>
        <CardDescription>
          Crea el acceso para un miembro del personal y asígnale un rol.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex max-w-sm flex-col gap-4">
          <FormStagger className="flex flex-col gap-4">
            <Field label="Nombre completo" htmlFor="fullName" required>
              <Input id="fullName" name="fullName" required />
            </Field>

            <Field label="Correo" htmlFor="email" required>
              <Input id="email" name="email" type="email" required />
            </Field>

            <Field label="Contraseña temporal" htmlFor="password" required hint="Mínimo 8 caracteres">
              <Input id="password" name="password" type="password" minLength={8} required />
            </Field>

            <Field label="Rol" htmlFor="roleId" required>
              <Select
                name="roleId"
                required
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
          </FormStagger>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          {state?.success && (
            <Alert>
              <AlertDescription>Usuario creado correctamente.</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={pending} loading={pending} className="mt-2">
            {pending ? "Creando..." : "Crear usuario"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
