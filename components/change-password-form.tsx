"use client";

import Image from "next/image";
import { useActionState } from "react";
import { changePassword, logout, type ChangePasswordState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FormStagger } from "@/components/ui/field";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ChangePasswordState, FormData>(
    changePassword,
    undefined,
  );

  return (
    <Card className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-2 rounded-[28px] duration-500">
      <CardContent className="flex flex-col items-center gap-1 px-8">
        <Image src="/logo.png" alt="CRM Clínica" width={190} height={104} priority />
        <p className="text-center text-[13px] text-muted-foreground">
          Estás usando una contraseña temporal. Elige una propia para continuar.
        </p>

        <form action={action} className="mt-4 flex w-full flex-col gap-3">
          <FormStagger className="flex flex-col gap-3.5">
            <Field
              label="Nueva contraseña"
              htmlFor="password"
              required
              hint="Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo."
            >
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>

            <Field label="Confirma la contraseña" htmlFor="confirmPassword" required>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </Field>
          </FormStagger>

          {state?.error && (
            <Alert variant="destructive">
              <AlertDescription>{state.error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={pending}
            loading={pending}
            className="mt-2 h-auto w-full py-3 font-heading text-sm"
          >
            {pending ? "Guardando..." : "Guardar contraseña"}
          </Button>
        </form>

        <form action={logout} className="mt-3.5">
          <button type="submit" className="text-xs text-muted-foreground hover:underline">
            Cerrar sesión
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
