/** Resalta un dato pendiente de reemplazar dentro del texto legal (ver PendingDetailBanner). */
export function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[0.9em] text-amber-900">
      [{children}]
    </span>
  );
}
