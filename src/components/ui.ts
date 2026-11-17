import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap";
const variants: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  secondary: "border border-line bg-card text-ink hover:bg-subtle",
  ghost: "text-muted hover:bg-subtle hover:text-ink",
  danger: "text-danger hover:bg-danger-soft",
};
const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-[15px]",
};

export function button(variant: Variant = "primary", size: Size = "md", extra?: string): string {
  return cn(base, variants[variant], sizes[size], extra);
}

export const input =
  "w-full rounded-lg border border-field bg-card px-3.5 py-2.5 text-base text-ink placeholder:text-faint focus:outline-2 focus:outline-offset-1 focus:outline-ink";

export const label = "mb-1.5 block text-sm font-semibold text-ink";

export const card = "rounded-2xl border border-line bg-card";

export const eyebrow = "text-xs font-bold uppercase tracking-[0.08em] text-muted";
