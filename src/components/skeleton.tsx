import { cn } from "@/lib/cn";

export function Bar({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-subtle", className)} />;
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-[880px] px-4 py-10 sm:px-5" aria-busy="true" aria-label="Loading">
      <Bar className="h-10 w-56" />
      <Bar className="mt-4 h-5 w-80 max-w-full" />
      <div className="mt-10 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-line bg-card p-6">
            <Bar className="h-7 w-2/3" />
            <Bar className="mt-3 h-4 w-full" />
            <Bar className="mt-5 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
