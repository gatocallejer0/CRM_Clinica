"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { GENERAL_NAV, ADMIN_NAV, isNavItemVisible, type NavItem } from "./nav-config";
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
      className={`group relative flex items-center gap-2.5 overflow-hidden rounded-xl px-2.5 py-2.5 text-sm transition-[color,transform] duration-150 outline-none active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring/50 ${
        active ? "font-semibold text-primary" : "font-medium text-foreground hover:bg-accent"
      }`}
    >
      {active && (
        <motion.div
          layoutId="sidebar-active-pill"
          className="absolute inset-0 rounded-xl bg-primary/10"
          transition={{ type: "spring", stiffness: 500, damping: 36 }}
        />
      )}
      <span
        className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-[9px] ${
          active ? "bg-primary/15" : "bg-accent"
        }`}
      >
        <Icon
          className={`size-3.5 ${active ? "text-primary" : "text-muted-foreground"}`}
          strokeWidth={1.75}
        />
      </span>
      {expanded && <span className="relative z-10 truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({
  profile,
  allowedScreens,
  pathname,
  isDesktop,
  collapsed,
  open,
  onToggleCollapsed,
}: {
  profile: Profile;
  allowedScreens: string[];
  pathname: string;
  isDesktop: boolean;
  collapsed: boolean;
  open: boolean;
  onToggleCollapsed: () => void;
}) {
  const expanded = isDesktop ? !collapsed : true;
  const width = isDesktop ? (collapsed ? "76px" : "272px") : "272px";

  const allowedSet = new Set(allowedScreens);
  const generalItems = GENERAL_NAV.filter((item) => isNavItemVisible(item, profile.role.name, allowedSet));
  const adminItems = ADMIN_NAV.filter((item) => isNavItemVisible(item, profile.role.name, allowedSet));

  return (
    <div
      style={{ width, position: isDesktop ? "relative" : "fixed" }}
      className={`inset-y-0 left-0 z-40 flex h-dvh shrink-0 flex-col overflow-hidden border-r border-black/[0.08] bg-[color:var(--sidebar)] backdrop-blur-2xl backdrop-saturate-150 transition-[width,transform] duration-200 ease-out ${
        isDesktop ? "" : open ? "translate-x-0" : "-translate-x-full"
      } ${expanded ? "p-4" : "p-3"}`}
    >
      <div className="mb-5 flex items-center gap-2.5 px-0.5">
        <div
          className="size-[38px] shrink-0 rounded-xl bg-white shadow-sm"
          style={{
            backgroundImage: "url(/logo-icon.png)",
            backgroundSize: "contain",
            backgroundPosition: "center",
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
            className="flex size-[26px] shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/60 outline-none hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-ring/50"
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
          className="mx-auto mb-2 flex size-[26px] shrink-0 items-center justify-center rounded-lg border border-white/80 bg-white/60 outline-none hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-ring/50"
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
          <NavLink
            key={item.href}
            item={item}
            active={pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`))}
            expanded={expanded}
          />
        ))}

        {adminItems.length > 0 && (
          <>
            {expanded && (
              <div className="px-2.5 pt-4 pb-1 text-[11px] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                Administración
              </div>
            )}
            {adminItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                expanded={expanded}
              />
            ))}
          </>
        )}
      </nav>

      <div className="flex items-center gap-2.5 border-t border-[rgba(200,160,170,0.3)] pt-3.5">
        <Link
          href="/cuenta"
          title="Mi cuenta"
          className="-m-1 flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1 outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <div className="flex size-[38px] shrink-0 items-center justify-center rounded-full bg-[image:var(--gradient-neutral)] font-heading text-[13px] font-bold text-white">
            {getInitials(profile.full_name)}
          </div>
          {expanded && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-foreground">
                {profile.full_name}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">{profile.role.name}</div>
            </div>
          )}
        </Link>
        {expanded && (
          <form action={logout}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="-m-1 shrink-0 rounded-md p-1 text-[11px] font-semibold whitespace-nowrap text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              Salir
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
