"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { GENERAL_NAV, ADMIN_NAV, type NavItem } from "./nav-config";
import type { Profile } from "@/lib/auth/roles";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  return initials || "?";
}

function NavLink({
  item,
  active,
  expanded,
}: {
  item: NavItem;
  active: boolean;
  expanded: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-sm transition-[background-color,transform] duration-150 active:scale-[0.96] ${
        active
          ? "bg-[image:var(--gradient-primary)] font-semibold text-white"
          : "font-medium text-foreground hover:bg-accent"
      }`}
    >
      <span
        className={`flex size-7 shrink-0 items-center justify-center rounded-[9px] ${
          active ? "bg-white/20" : "bg-accent"
        }`}
      >
        <Icon
          className={`size-3.5 ${active ? "text-white" : "text-primary"}`}
          strokeWidth={1.75}
        />
      </span>
      {expanded && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({
  profile,
  pathname,
  isDesktop,
  collapsed,
  open,
  onToggleCollapsed,
}: {
  profile: Profile;
  pathname: string;
  isDesktop: boolean;
  collapsed: boolean;
  open: boolean;
  onToggleCollapsed: () => void;
}) {
  const expanded = isDesktop ? !collapsed : true;
  const width = isDesktop ? (collapsed ? "76px" : "252px") : "252px";

  const generalItems = GENERAL_NAV.filter((item) => item.roles.includes(profile.role.name));
  const adminItems = ADMIN_NAV.filter((item) => item.roles.includes(profile.role.name));

  return (
    <div
      style={{ width, position: isDesktop ? "relative" : "fixed" }}
      className={`inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r border-white/70 bg-[color:var(--sidebar)] shadow-[inset_-1px_0_0_rgba(255,255,255,0.4)] backdrop-blur-2xl backdrop-saturate-150 transition-[width,transform] duration-200 ease-out ${
        isDesktop ? "" : open ? "translate-x-0" : "-translate-x-full"
      } ${expanded ? "p-4" : "p-3"}`}
    >
      <div className="mb-5 flex items-center gap-2.5 px-0.5">
        <div
          className="size-[38px] shrink-0 rounded-xl bg-white shadow-sm"
          style={{
            backgroundImage: "url(/logo.png)",
            backgroundSize: "69px 38px",
            backgroundPosition: "0 0",
            backgroundRepeat: "no-repeat",
          }}
        />
        {expanded && (
          <div className="min-w-0 flex-1">
            <div className="truncate font-heading text-sm font-semibold text-foreground">
              {profile.full_name}
            </div>
            <div className="truncate text-[10.5px] text-muted-foreground">
              {profile.role.name}
            </div>
          </div>
        )}
        {isDesktop && expanded && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            title="Contraer menú"
            className="flex size-[26px] shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/60 hover:bg-white/80"
          >
            <ChevronLeft className="size-3.5 text-muted-foreground" strokeWidth={2} />
          </button>
        )}
      </div>

      {isDesktop && collapsed && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          title="Expandir menú"
          className="mx-auto mb-2 flex size-[26px] shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/60 hover:bg-white/80"
        >
          <ChevronRight className="size-3.5 text-muted-foreground" strokeWidth={2} />
        </button>
      )}

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {expanded && (
          <div className="px-2.5 pt-2.5 pb-1 text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
            General
          </div>
        )}
        {generalItems.map((item) => (
          <NavLink key={item.href} item={item} active={pathname === item.href} expanded={expanded} />
        ))}

        {adminItems.length > 0 && (
          <>
            {expanded && (
              <div className="px-2.5 pt-4 pb-1 text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                Administración
              </div>
            )}
            {adminItems.map((item) => (
              <NavLink key={item.href} item={item} active={pathname === item.href} expanded={expanded} />
            ))}
          </>
        )}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-[rgba(200,160,170,0.3)] pt-3.5">
        <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] font-heading text-[13px] font-bold text-white">
          {getInitials(profile.full_name)}
        </div>
        {expanded && (
          <>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-foreground">
                {profile.full_name}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">{profile.role.name}</div>
            </div>
            <form action={logout}>
              <button
                type="submit"
                title="Cerrar sesión"
                className="shrink-0 text-[11px] font-semibold whitespace-nowrap text-primary hover:underline"
              >
                Salir
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
