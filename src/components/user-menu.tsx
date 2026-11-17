"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Wraps the account dropdown so it closes on navigation, outside clicks and Escape. */
export function UserMenu({ label, trigger, children }: { label: string; trigger: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) {
        el.open = false;
        if (e instanceof KeyboardEvent) el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary
        className="flex size-11 cursor-pointer list-none items-center justify-center rounded-full hover:bg-subtle [&::-webkit-details-marker]:hidden"
        aria-label={label}
      >
        {trigger}
      </summary>
      <div className="absolute right-0 z-30 mt-2 w-60 rounded-xl border border-line bg-card p-1.5 shadow-lg">{children}</div>
    </details>
  );
}
