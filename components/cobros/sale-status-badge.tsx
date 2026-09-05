import type { SaleStatus } from "@/app/actions/catalog";
import { SALE_STATUS_LABELS, SALE_STATUS_STYLE } from "./sale-meta";

export function SaleStatusBadge({ status }: { status: SaleStatus }) {
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
      style={SALE_STATUS_STYLE[status]}
    >
      {SALE_STATUS_LABELS[status]}
    </span>
  );
}
