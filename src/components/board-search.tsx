"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { cn } from "@/lib/cn";
import { SearchIcon, XIcon } from "./icons";

/**
 * Search for the board: a round button that expands into a field. Typing filters the
 * board below (through ?q=). Press "/" anywhere on the board to open it.
 */
export function BoardSearch({ q }: { q: string }) {
  const router = useRouter();
  const rootRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(Boolean(q));
  const [text, setText] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  const [sentQ, setSentQ] = useState(q);
  // When the URL's search changes from outside this field (e.g. "Clear search"), show it.
  if (q !== seenQ) {
    setSeenQ(q);
    if (q !== sentQ.trim()) {
      setText(q);
      setSentQ(q);
      setExpanded(Boolean(q));
    }
  }

  const go = (value: string) => {
    clearTimeout(timer.current);
    const v = value.trim();
    if (v === sentQ.trim()) return;
    setSentQ(v);
    startTransition(() => router.replace(v ? `/?q=${encodeURIComponent(v)}` : "/", { scroll: false }));
  };

  const focusField = () => requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));

  const expand = () => {
    setExpanded(true);
    focusField();
  };

  const collapse = (refocus: boolean) => {
    setExpanded(false);
    setText("");
    go("");
    if (refocus) triggerRef.current?.focus();
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  // "/" opens search, like most sites.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      setExpanded(true);
      focusField();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <form
      ref={rootRef}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(text);
      }}
      onBlur={(e) => {
        if (e.relatedTarget instanceof Node && rootRef.current?.contains(e.relatedTarget)) return;
        if (!text.trim()) collapse(false);
      }}
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
        {pending ? (
          <span className="size-4 animate-spin rounded-full border-2 border-line border-t-muted motion-reduce:animate-none" />
        ) : (
          <SearchIcon size={18} className={cn("transition-transform duration-300 motion-reduce:transition-none", expanded && "scale-90")} />
        )}
      </button>
      <input
        ref={inputRef}
        type="search"
        name="q"
        aria-label="Search topics"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search topics"
        value={text}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => go(value), 250);
        }}
        onKeyDown={(e) => {
          if (e.key !== "Escape") return;
          e.preventDefault();
          if (text) {
            setText("");
            go("");
          } else collapse(true);
        }}
        className={cn(
          "h-full w-full bg-transparent pl-11 pr-11 text-base text-ink outline-none placeholder:text-faint [&::-webkit-search-cancel-button]:appearance-none",
          // Visible right away (so it can take focus), fading in once the field has widened.
          expanded
            ? "visible opacity-100 [transition:opacity_200ms_ease-out_150ms]"
            : "invisible opacity-0 [transition:opacity_150ms_ease-out,visibility_0s_linear_150ms]",
          "motion-reduce:transition-none",
        )}
      />
      <button
        type="button"
        aria-label="Close search"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => collapse(true)}
        className={cn(
          "absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted outline-none hover:text-ink focus-visible:text-ink",
          expanded
            ? "visible rotate-0 opacity-100 [transition:opacity_200ms_ease-out_150ms,transform_200ms_ease-out_150ms]"
            : "invisible -rotate-90 opacity-0 [transition:opacity_150ms_ease-out,transform_150ms_ease-out,visibility_0s_linear_150ms]",
          "motion-reduce:transition-none",
        )}
      >
        <XIcon size={18} />
      </button>
    </form>
  );
}
