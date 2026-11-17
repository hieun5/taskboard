import { Bar } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="rounded-2xl border border-line bg-card p-8" aria-busy="true" aria-label="Loading">
      <Bar className="h-8 w-32" />
      <Bar className="mt-6 h-12 w-full" />
      <Bar className="mt-4 h-12 w-full" />
    </div>
  );
}
