import { cn } from "@/lib/cn";

export function FormError({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p role="alert" className={cn("rounded-lg bg-danger-soft px-3.5 py-2.5 text-sm font-medium text-danger", className)}>
      {children}
    </p>
  );
}

export function FormSuccess({ children, className }: { children?: React.ReactNode; className?: string }) {
  if (!children) return null;
  return (
    <p
      role="status"
      className={cn(
        "rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300",
        className,
      )}
    >
      {children}
    </p>
  );
}
