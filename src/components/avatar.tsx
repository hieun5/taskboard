import { cn } from "@/lib/cn";
import { initials } from "@/lib/format";

const PALETTE = [
  "bg-orange-100 text-orange-900 dark:bg-orange-400/15 dark:text-orange-200",
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200",
  "bg-sky-100 text-sky-900 dark:bg-sky-400/15 dark:text-sky-200",
  "bg-violet-100 text-violet-900 dark:bg-violet-400/15 dark:text-violet-200",
  "bg-rose-100 text-rose-900 dark:bg-rose-400/15 dark:text-rose-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const SIZES = { xs: "size-6 text-[11px]", sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-11 text-[15px]" };

export function Avatar({
  id,
  name,
  size = "md",
  className,
}: {
  id: string;
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold",
        SIZES[size],
        PALETTE[hash(id) % PALETTE.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
