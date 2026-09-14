"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateRoleScreens, type RoleRow } from "@/app/actions/roles";
import { CONFIGURABLE_SCREENS } from "@/lib/auth/screens";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";

const GROUPS = ["General", "Admin Center"] as const;

export function RoleScreensDialog({
  open,
  onOpenChange,
  role,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleRow;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role.screenKeys));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | undefined>();

  function toggle(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleSave() {
    setError(undefined);
    startTransition(async () => {
      const result = await updateRoleScreens(role.id, [...selected]);
      if (result.error) {
        setError(result.error);
        return;
      }
      toast.success("Permisos actualizados");
      onSaved();
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permisos de &quot;{role.name}&quot;</DialogTitle>
          <DialogDescription>
            Elige qué pantallas puede ver este rol. Las que dejes apagadas no van a aparecer en su menú, y
            entrar directo por la URL los va a mandar al inicio.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {GROUPS.map((group) => (
            <div key={group} className="flex flex-col gap-1.5">
              <p className="px-1 text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                {group}
              </p>
              <div className="divide-y divide-border rounded-lg border border-border">
                {CONFIGURABLE_SCREENS.filter((s) => s.group === group).map((screen) => (
                  <label
                    key={screen.key}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/50"
                  >
                    <span className="text-sm text-foreground">{screen.label}</span>
                    <Switch
                      checked={selected.has(screen.key)}
                      onCheckedChange={() => toggle(screen.key)}
                      disabled={pending}
                    />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <DialogClose render={<Button type="button" variant="outline" />}>Cancelar</DialogClose>
          <Button type="button" onClick={handleSave} disabled={pending} loading={pending}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
