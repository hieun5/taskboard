"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { MonitorIcon, MoonIcon, SunIcon } from "./icons";

export type ThemeChoice = "light" | "dark" | "system";

function apply(choice: ThemeChoice) {
  const dark = choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function readChoice(): ThemeChoice {
  try {
    const t = localStorage.getItem("theme");
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>("system");

  useEffect(() => {
    // Sync with what the inline head script already applied.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChoice(readChoice());
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => readChoice() === "system" && apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const set = (next: ThemeChoice) => {
    setChoice(next);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {}
    apply(next);
  };
  return [choice, set] as const;
}

const OPTIONS: { value: ThemeChoice; label: string; Icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "Match device", Icon: MonitorIcon },
];

/** Single button in the header: cycles light → dark → system. */
export function ThemeToggle() {
  const [choice, set] = useTheme();
  const index = OPTIONS.findIndex((o) => o.value === choice);
  const current = OPTIONS[index];
  const next = OPTIONS[(index + 1) % OPTIONS.length];
  return (
    <button
      type="button"
      onClick={() => set(next.value)}
      className="inline-flex size-11 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
      aria-label={`Theme: ${current.label}. Switch to ${next.label.toLowerCase()}`}
      title={`Theme: ${current.label}`}
    >
      <current.Icon size={19} />
    </button>
  );
}

/** Three-way segmented control, used on the settings page. */
export function ThemePicker() {
  const [choice, set] = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex flex-wrap gap-1 rounded-xl bg-subtle p-1">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={choice === value}
          onClick={() => set(value)}
          className={cn(
            "inline-flex min-h-10 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold",
            choice === value ? "bg-card text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
          )}
        >
          <Icon size={16} />
          {label}
        </button>
      ))}
    </div>
  );
}
