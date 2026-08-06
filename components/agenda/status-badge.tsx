import type { AppointmentStatus } from "@/app/actions/appointments";
import { STATUS_LABELS, STATUS_STYLE } from "./appointment-meta";

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span
      className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap"
      style={STATUS_STYLE[status]}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
