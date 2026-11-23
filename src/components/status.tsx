import type { TopicStatus } from "@/db/schema";
import { cn } from "@/lib/cn";

export const STATUS_META: Record<TopicStatus, { label: string; pill: string; dot: string }> = {
  active: {
    label: "Active",
    pill: "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    dot: "bg-emerald-500 dark:bg-emerald-400",
  },
  done: {
    label: "Done",
    pill: "bg-zinc-100 text-zinc-700 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700",
    dot: "bg-zinc-400 dark:bg-zinc-500",
  },
};

export const STATUS_ORDER: TopicStatus[] = ["active", "done"];

export function StatusPill({ status, className }: { status: TopicStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset",
        meta.pill,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  );
}

export function NewBadge({ className, children = "New" }: { className?: string; children?: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-400/15 dark:text-amber-300",
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      {children}
    </span>
  );
}
