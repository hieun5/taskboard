"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { SearchIcon } from "./icons";
import { input } from "./ui";

type Status = "all" | "open" | "active" | "wrapped_up";
const CHIPS: { value: Status; label: string }[] = [
  { value: "all", label: "All" },
  { value: "open", label: "Open" },
  { value: "active", label: "Active" },
  { value: "wrapped_up", label: "Wrapped up" },
];

export function BoardFilters({ q, status, sort }: { q: string; status: Status; sort: "newest" | "active" }) {
  const router = useRouter();
  const [text, setText] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  const [sentQ, setSentQ] = useState(q);
  // When the URL's search changes from outside this box (e.g. "Clear filters"), show it.
  if (q !== seenQ) {
    setSeenQ(q);
    if (q !== sentQ.trim()) setText(q);
  }
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = (next: { q?: string; status?: Status; sort?: "newest" | "active" }) => {
    const params = new URLSearchParams();
    const nq = next.q ?? text;
    setSentQ(nq);
    const ns = next.status ?? status;
    const nsort = next.sort ?? sort;
    if (nq.trim()) params.set("q", nq.trim());
    if (ns !== "all") params.set("status", ns);
    if (nsort !== "newest") params.set("sort", nsort);
    const qs = params.toString();
    startTransition(() => router.replace(qs ? `/?${qs}` : "/", { scroll: false }));
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <div className={cn("flex flex-wrap items-center gap-3 transition-opacity", pending && "opacity-70")}>
      <form
        role="search"
        className="relative min-w-0 flex-[1_1_260px]"
        onSubmit={(e) => {
          e.preventDefault();
          clearTimeout(timer.current);
          go({ q: text });
        }}
      >
        <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="search"
          name="q"
          value={text}
          onChange={(e) => {
            const value = e.target.value;
            setText(value);
            clearTimeout(timer.current);
            timer.current = setTimeout(() => go({ q: value }), 300);
          }}
          placeholder="Search topics"
          aria-label="Search topics"
          className={cn(input, "min-h-11 pl-10")}
        />
      </form>
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-pressed={status === c.value}
            onClick={() => go({ status: c.value })}
            className={cn(
              "min-h-11 rounded-full border px-4 text-sm",
              status === c.value
                ? "border-primary bg-primary font-semibold text-on-primary"
                : "border-line bg-card font-medium text-ink hover:bg-subtle",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <label className="ml-auto inline-flex items-center gap-2 text-sm text-muted">
        <span>Sort</span>
        <select
          value={sort}
          onChange={(e) => go({ sort: e.target.value as "newest" | "active" })}
          className="min-h-11 rounded-lg border border-field bg-card px-2.5 text-sm font-semibold text-ink"
        >
          <option value="newest">Newest</option>
          <option value="active">Recently active</option>
        </select>
      </label>
    </div>
  );
}
