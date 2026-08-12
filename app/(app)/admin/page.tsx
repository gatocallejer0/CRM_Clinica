import Link from "next/link";
import { requireRole } from "@/lib/auth/roles";
import { ADMIN_SECTIONS } from "@/components/app-shell/nav-config";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default async function AdminCenterPage() {
  await requireRole(["Admin"]);

  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">
        Elige una sección para administrar la clínica.
      </p>

      <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {ADMIN_SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href} className="block">
              <Card className="h-full transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-glass-lg)]">
                <CardHeader>
                  <div className="mb-2 flex size-10 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="size-5 text-primary" strokeWidth={1.75} />
                  </div>
                  <CardTitle>{section.label}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
