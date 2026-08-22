import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export function BackToAdminLink() {
  return (
    <Link
      href="/admin"
      className="flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" />
      Volver a Admin Center
    </Link>
  );
}
