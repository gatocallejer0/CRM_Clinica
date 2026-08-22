"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PencilIcon, PlusIcon } from "lucide-react";
import type { UserRow, Role } from "@/app/actions/users";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { AuditLogDialog } from "@/components/shared/audit-log-dialog";
import { UserDialog } from "./user-dialog";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

type StatusFilter = "all" | "active" | "inactive";

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
];

export function UsersView({
  users,
  roles,
  currentUserId,
}: {
  users: UserRow[];
  roles: Role[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | undefined>(undefined);

  const counts = useMemo(
    () => ({
      all: users.length,
      active: users.filter((u) => u.active).length,
      inactive: users.filter((u) => !u.active).length,
    }),
    [users],
  );

  const roleFilterOptions = useMemo(
    () => ["all", ...roles.map((r) => r.id)],
    [roles],
  );
  const roleFilterLabelById = useMemo(
    () => new Map([["all", "Todos los roles"], ...roles.map((r): [string, string] => [r.id, r.name])]),
    [roles],
  );

  const q = query.trim().toLowerCase();
  const filtered = users.filter((u) => {
    if (statusFilter === "active" && !u.active) return false;
    if (statusFilter === "inactive" && u.active) return false;
    if (roleFilter !== "all" && u.role?.id !== roleFilter) return false;
    if (q && !u.full_name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) {
      return false;
    }
    return true;
  });

  function openCreateDialog() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEditDialog(user: UserRow) {
    setEditing(user);
    setDialogOpen(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Crea y consulta el acceso del personal de la clínica.
        </p>
        <Button onClick={openCreateDialog}>
          <PlusIcon />
          Nuevo usuario
        </Button>
      </div>

      <Card className="gap-0 p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3">
          <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/70 bg-white/50 p-1">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                  statusFilter === tab.value
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                {tab.label}
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold ${
                    statusFilter === tab.value
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {counts[tab.value]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border px-5 py-3">
          <Combobox
            items={roleFilterOptions}
            value={roleFilter}
            onValueChange={(value) => setRoleFilter(value ?? "all")}
            itemToStringLabel={(id: string) => roleFilterLabelById.get(id) ?? ""}
          >
            <ComboboxInputGroup className="w-44">
              <ComboboxInput />
              <ComboboxTrigger />
            </ComboboxInputGroup>
            <ComboboxPopup>
              <ComboboxEmpty>Sin resultados.</ComboboxEmpty>
              <ComboboxList>
                {(id: string) => (
                  <ComboboxItem key={id} value={id}>
                    {roleFilterLabelById.get(id)}
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxPopup>
          </Combobox>
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="max-w-xs"
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-5">Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="pr-5 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="pl-5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-neutral)] font-heading text-xs font-bold text-white">
                      {getInitials(user.full_name)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-foreground">
                        {user.full_name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{user.role?.name ?? "—"}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={user.active ? "border-transparent" : undefined}
                    style={
                      user.active
                        ? {
                            color: "var(--status-confirmed-fg)",
                            backgroundColor: "var(--status-confirmed-bg)",
                          }
                        : undefined
                    }
                  >
                    {user.active ? "Activo" : "Inactivo"}
                  </Badge>
                </TableCell>
                <TableCell className="pr-5 text-right">
                  <div className="flex items-center justify-end">
                    <AuditLogDialog tableName="profiles" recordId={user.id} title={user.full_name} />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(user)}
                      title="Editar usuario"
                    >
                      <PencilIcon className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Sin usuarios que coincidan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <UserDialog
        key={editing?.id ?? "create"}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        roles={roles}
        user={editing}
        isSelf={editing?.id === currentUserId}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
