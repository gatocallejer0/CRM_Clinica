"use client";

import { Menu } from "lucide-react";
import { getScreenTitle } from "./nav-config";

const TODAY_LABEL = new Intl.DateTimeFormat("es-GT", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
}).format(new Date());

export function Header({
  pathname,
  isDesktop,
  onOpenMobileSidebar,
}: {
  pathname: string;
  isDesktop: boolean;
  onOpenMobileSidebar: () => void;
}) {
  return (
    <div className="flex h-[66px] shrink-0 items-center justify-between gap-5 border-b border-[rgba(210,170,180,0.25)] bg-white/32 px-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.5)] backdrop-blur-2xl backdrop-saturate-150 min-[861px]:px-8">
      {!isDesktop && (
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="flex size-9 shrink-0 items-center justify-center rounded-[11px] border border-white/80 bg-white/55"
        >
          <Menu className="size-4 text-foreground" strokeWidth={1.8} />
        </button>
      )}
      <div className="shrink-0 font-heading text-[19px] font-semibold text-foreground">
        {getScreenTitle(pathname)}
      </div>
      <div className="flex-1" />
      <div className="shrink-0 text-[12.5px] whitespace-nowrap text-muted-foreground capitalize">
        {TODAY_LABEL}
      </div>
    </div>
  );
}
