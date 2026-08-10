"use client";

import Image from "next/image";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field, FormStagger } from "@/components/ui/field";

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(
    login,
    undefined,
  );

  return (
    <Card className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-2 rounded-[28px] duration-500">
      <CardContent className="flex flex-col items-center gap-1 px-8">
        <Image src="/logo.png" alt="CRM Clínica" width={190} height={104} priority />
        <p className="text-[13px] text-muted-foreground">Portal de gestión clínica</p>

        <form action={action} className="mt-4 flex w-full flex-col gap-3">
          <input type="hidden" name="redirectTo" value={redirectTo ?? ""} />

          <FormStagger className="flex flex-col gap-3.5">
            <Field label="Correo electrónico" htmlFor="email" required>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nombre@clinica.com"
                required
              />
            </Field>

            <Field label="Contraseña" htmlFor="password" required>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
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
            {pending ? "Ingresando..." : "Iniciar sesión"}
          </Button>
        </form>

        <p className="mt-3.5 text-center text-xs text-muted-foreground">
          ¿Nueva colaboradora? Pide a tu administrador que te cree un acceso.
        </p>
      </CardContent>
    </Card>
  );
}
