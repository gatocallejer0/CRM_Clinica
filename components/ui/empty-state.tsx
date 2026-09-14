import { isValidElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function EmptyState({
  icon,
  message,
  tone = "neutral",
  className,
}: {
  /**
   * Un componente sin instanciar (`CalendarDaysIcon`) cuando `EmptyState` se
   * renderiza dentro de otro Server Component; o un ícono ya renderizado
   * (`<CalendarDaysIcon />`) cuando el valor cruza a un "use client" — un
   * componente sin instanciar no se puede pasar de un Server Component a un
   * Client Component.
   */
  icon: LucideIcon | ReactNode;
  message: string;
  tone?: "neutral" | "positive" | "warning";
  className?: string;
}) {
  const Icon = icon as LucideIcon;
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2.5 py-10 text-center", className)}>
      <div
        className={cn(
          "flex size-10 items-center justify-center rounded-full",
          tone === "neutral" && "bg-muted text-muted-foreground",
        )}
        style={
          tone === "positive"
            ? { color: "var(--status-confirmed-fg)", backgroundColor: "var(--status-confirmed-bg)" }
            : tone === "warning"
              ? { color: "var(--status-waiting-fg)", backgroundColor: "var(--status-waiting-bg)" }
              : undefined
        }
      >
        {isValidElement(icon) ? icon : <Icon className="size-[18px]" strokeWidth={1.75} />}
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export { EmptyState };
