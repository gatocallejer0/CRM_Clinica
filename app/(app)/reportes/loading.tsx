import { TableSkeleton } from "@/components/skeletons/skeletons";

export default function Loading() {
  return <TableSkeleton rows={8} columns={5} />;
}
