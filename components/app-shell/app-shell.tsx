"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import type { Profile } from "@/lib/auth/roles";

const BREAKPOINT = 861;

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isDesktop, setIsDesktop] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${BREAKPOINT}px)`);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {!isDesktop && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-[rgba(40,20,25,0.35)]"
        />
      )}

      <Sidebar
        profile={profile}
        pathname={pathname}
        isDesktop={isDesktop}
        collapsed={collapsed}
        open={mobileOpen}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          pathname={pathname}
          isDesktop={isDesktop}
          onOpenMobileSidebar={() => setMobileOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-[18px] min-[861px]:p-8">{children}</main>
      </div>
    </div>
  );
}
