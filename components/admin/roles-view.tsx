"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRoundIcon, PencilIcon, PlusIcon, ShieldIcon, Trash2Icon } from "lucide-react";
import { deleteRole, type RoleRow } from "@/app/actions/roles";
import { CONFIGURABLE_SCREENS } from "@/lib/auth/screens";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { BackToAdminLink } from "./back-to-admin-link";
import { RoleDialog } from "./role-dialog";
import { RoleScreensDialog } from "./role-screens-dialog";

function DeleteRoleButton({ role, onDeleted }: { role: RoleRow; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteRole(role.id);
      if (result.error) {
        toast.error(result.error);
        setConfirming(false);
        return;
      }
      toast.success("Rol eliminado");
      onDeleted();
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={pending}
          loading={pending}
          onClick={handleDelete}
        >
          Confirmar
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ghost" size="icon-sm" onClick={() => setConfirming(true)} title="Eliminar rol">
      <Trash2Icon className="size-4" />
    </Button>
  );
}

export function RolesView({ roles }: { roles: RoleRow[] }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RoleRow | undefined>(undefined);
  const [screensRole, setScreensRole] = useState<RoleRow | undefined>(undefined);

  function openCreateDialog() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(role: RoleRow) {
    setEditing(role);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <BackToAdminLink />
        <Button onClick={openCreateDialog}>
          <PlusIcon />
          Nuevo rol
        </Button>
      </div>

      <Card className="gap-0 p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Nombre</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>Usuarios</TableHead>
              <TableHead>Pantallas</TableHead>
              <TableHead className="pr-5 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.map((role) => {
              const isAdmin = role.name === "Admin";
              return (
                <TableRow key={role.id}>
                  <TableCell className="pl-5 font-medium text-foreground">{role.name}</TableCell>
                  <TableCell className="max-w-xs text-muted-foreground">{role.description ?? "—"}</TableCell>
                  <TableCell>{role.userCount}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <Badge
                        variant="outline"
                        className="border-transparent"
                        style={{ color: "var(--status-confirmed-fg)", backgroundColor: "var(--status-confirmed-bg)" }}
                      >
                        Acceso total
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        {role.screenKeys.length} de {CONFIGURABLE_SCREENS.length}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {isAdmin ? (
                      <span className="text-xs text-muted-foreground">Protegido</span>
                    ) : (
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon-sm" onClick={() => setScreensRole(role)} title="Permisos">
                          <KeyRoundIcon className="size-4" />
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(role)} title="Editar rol">
                          <PencilIcon className="size-4" />
                        </Button>
                        <DeleteRoleButton role={role} onDeleted={() => router.refresh()} />
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {roles.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={5} className="p-0">
                  <EmptyState icon={ShieldIcon} message="Sin roles todavía." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <RoleDialog
        key={editing?.id ?? "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        role={editing}
        onSaved={() => router.refresh()}
      />

      {screensRole && (
        <RoleScreensDialog
          key={screensRole.id}
          open
          onOpenChange={(open) => !open && setScreensRole(undefined)}
          role={screensRole}
          onSaved={() => router.refresh()}
        />
      )}
    </div>
  );
}
