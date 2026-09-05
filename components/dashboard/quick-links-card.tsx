import Link from "next/link";
import type { NavItem } from "@/components/app-shell/nav-config";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function QuickLinksCard({ items }: { items: NavItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="gap-0 p-0">
      <CardHeader className="p-5">
        <CardTitle>Accesos rápidos</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 px-5 pb-5 min-[400px]:grid-cols-2">
        {items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-input bg-white/35 px-3.5 py-3 text-sm font-medium text-foreground transition-colors hover:border-ring/40 hover:bg-white/60"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
            {label}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
