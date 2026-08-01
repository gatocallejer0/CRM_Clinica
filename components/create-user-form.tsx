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
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
        <form action={action} className="flex flex-col gap-4 max-w-sm">
          <div className="flex flex-col gap-2">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" name="fullName" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" required />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña temporal</Label>
            <Input
              id="password"
              name="password"
              type="password"
              minLength={8}
              required
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="roleId">Rol</Label>
            <Select name="roleId" required>
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
          </div>

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

          <Button type="submit" disabled={pending} className="mt-2">
            {pending ? "Creando..." : "Crear usuario"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
