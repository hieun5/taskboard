"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { TopicSearchResult } from "@/lib/data/topics";
import { SearchIcon, XIcon } from "./icons";
import { StatusPill } from "./status";

type Results = { q: string; items: TopicSearchResult[]; failed?: boolean };

function Highlight({ text, q }: { text: string; q: string }) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (!q || i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-primary/15 px-0.5 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Search for the board: a round button that expands into a field, with matching topics
 * in an animated popup underneath. Press "/" anywhere on the board to open it.
 */
export function BoardSearch() {
  const router = useRouter();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [active, setActive] = useState(-1);

  const q = text.trim();
  const loading = Boolean(q) && results?.q !== q;
  const popupVisible = expanded && open && Boolean(q);
  const items = results?.items ?? [];
  const hasList = items.length > 0;

  // Fetch matches as you type (debounced; stale requests are cancelled).
  useEffect(() => {
    if (!q) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/topics/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`Search failed (${res.status})`);
        const found = (await res.json()) as TopicSearchResult[];
        setResults({ q, items: found });
        setActive(found.length ? 0 : -1);
      } catch {
        if (ctrl.signal.aborted) return;
        setResults({ q, items: [], failed: true });
        setActive(-1);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    if (active >= 0) document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  const expand = () => {
    setExpanded(true);
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  };

  const collapse = (refocus: boolean) => {
    setExpanded(false);
    setOpen(false);
    setText("");
    setResults(null);
    setActive(-1);
    if (refocus) triggerRef.current?.focus();
  };

  // "/" opens search, like most sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      setExpanded(true);
      setOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      if (!items.length) return;
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a < 0 ? (step > 0 ? 0 : items.length - 1) : (a + step + items.length) % items.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = !loading && popupVisible ? items[active] : undefined;
      if (hit) router.push(`/topics/${hit.id}`);
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (popupVisible) setOpen(false);
      else collapse(true);
    }
  };

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(e) => {
        if (e.relatedTarget instanceof Node && rootRef.current?.contains(e.relatedTarget)) return;
        setOpen(false);
        if (!q) collapse(false);
      }}
    >
      <div
        className={cn(
          "relative h-11 max-w-[560px] overflow-hidden rounded-full border bg-card",
          "transition-[width,border-color,box-shadow,background-color] duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:transition-none",
          "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ink",
          expanded ? "w-full border-field shadow-sm" : "w-11 border-line hover:bg-subtle",
        )}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => (expanded ? inputRef.current?.focus() : expand())}
          aria-label="Search topics"
          aria-expanded={expanded}
          aria-hidden={expanded}
          tabIndex={expanded ? -1 : 0}
          className="absolute inset-y-0 left-0 z-10 flex w-11 items-center justify-center text-muted outline-none hover:text-ink"
        >
          <SearchIcon size={18} className={cn("transition-transform duration-300 motion-reduce:transition-none", expanded && "scale-90")} />
        </button>
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Search topics"
          aria-autocomplete="list"
          aria-expanded={popupVisible}
          aria-controls={hasList ? listId : undefined}
          aria-activedescendant={popupVisible && hasList && active >= 0 ? `${listId}-${active}` : undefined}
          aria-hidden={!expanded}
          tabIndex={expanded ? 0 : -1}
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          placeholder="Search topics"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
            if (!e.target.value.trim()) setResults(null);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className={cn(
            "h-full w-full bg-transparent pl-11 pr-11 text-base text-ink outline-none placeholder:text-faint",
            "transition-opacity duration-200 motion-reduce:transition-none",
            expanded ? "opacity-100 delay-150" : "pointer-events-none opacity-0",
          )}
        />
        <button
          type="button"
          aria-label="Close search"
          aria-hidden={!expanded}
          tabIndex={expanded ? 0 : -1}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => collapse(true)}
          className={cn(
            "absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted outline-none hover:text-ink focus-visible:text-ink",
            "transition-[opacity,transform] duration-200 motion-reduce:transition-none",
            expanded ? "rotate-0 opacity-100 delay-150" : "pointer-events-none -rotate-90 opacity-0",
          )}
        >
          <XIcon size={18} />
        </button>
      </div>

      <div
        // Keep focus in the field while clicking inside the popup (Safari doesn't focus links on click).
        onMouseDown={(e) => e.preventDefault()}
        className={cn(
          "absolute left-0 top-full z-30 mt-2 w-full max-w-[560px] origin-top rounded-2xl border border-line bg-card p-1.5 shadow-xl",
          "transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none",
          popupVisible ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1.5 scale-[0.97] opacity-0",
        )}
      >
        {!results ? (
          <p className="flex items-center gap-2.5 px-3 py-3 text-sm text-muted" role="status">
            <span className="size-3.5 animate-spin rounded-full border-2 border-line border-t-muted motion-reduce:animate-none" aria-hidden="true" />
            Searching…
          </p>
        ) : results.failed ? (
          <p className="px-3 py-3 text-sm text-muted" role="status">
            Search isn&apos;t working right now. Try again in a moment.
          </p>
        ) : !hasList ? (
          <p className={cn("px-3 py-3 text-sm text-muted transition-opacity", loading && "opacity-60")} role="status">
            No topics match “{results.q}”
          </p>
        ) : (
          <ul
            key={results.q}
            id={listId}
            role="listbox"
            aria-label="Matching topics"
            className={cn("max-h-[min(60vh,28rem)] overflow-y-auto transition-opacity", loading && "opacity-60")}
          >
            {items.map((t, i) => (
              <li
                key={t.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className="animate-result-in motion-reduce:animate-none"
                style={{ animationDelay: `${i * 35}ms` }}
              >
                <Link
                  href={`/topics/${t.id}`}
                  tabIndex={-1}
                  onMouseEnter={() => setActive(i)}
                  className={cn("block rounded-xl px-3 py-2.5 transition-colors", i === active && "bg-subtle")}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0 font-serif text-lg font-medium leading-snug tracking-tight">
                      <Highlight text={t.title} q={results.q} />
                    </span>
                    <StatusPill status={t.status} className="mt-0.5 shrink-0" />
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-muted">{t.goal}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
