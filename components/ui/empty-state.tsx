import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function EmptyState({
  icon: Icon,
  message,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon;
  message: string;
  tone?: "neutral" | "positive";
  className?: string;
}) {
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
            : undefined
        }
      >
        <Icon className="size-[18px]" strokeWidth={1.75} />
      </div>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export { EmptyState };
