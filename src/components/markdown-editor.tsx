"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { BoldIcon, CheckListIcon, HeadingIcon, ItalicIcon, LinkIcon, ListIcon } from "./icons";
import { Markdown } from "./markdown";
import { input } from "./ui";

type Tool = { label: string; Icon: typeof BoldIcon; apply: (sel: string) => { text: string; select?: [number, number] } };

const TOOLS: Tool[] = [
  { label: "Bold", Icon: BoldIcon, apply: (s) => ({ text: `**${s || "bold text"}**`, select: [2, 2 + (s || "bold text").length] }) },
  { label: "Italic", Icon: ItalicIcon, apply: (s) => ({ text: `_${s || "italic text"}_`, select: [1, 1 + (s || "italic text").length] }) },
  { label: "Heading", Icon: HeadingIcon, apply: (s) => ({ text: `\n### ${s || "Heading"}\n`, select: [5, 5 + (s || "Heading").length] }) },
  {
    label: "Link",
    Icon: LinkIcon,
    apply: (s) => {
      const text = s || "link text";
      return { text: `[${text}](https://)`, select: [text.length + 3, text.length + 11] };
    },
  },
  {
    label: "Bulleted list",
    Icon: ListIcon,
    apply: (s) => ({ text: (s || "item").split("\n").map((l) => `- ${l}`).join("\n") }),
  },
  {
    label: "Checklist",
    Icon: CheckListIcon,
    apply: (s) => ({ text: (s || "to do").split("\n").map((l) => `- [ ] ${l}`).join("\n") }),
  },
];

/**
 * Plain Markdown textarea with a small formatting toolbar and a Write/Preview switch.
 * Submits as an ordinary form field called `name`.
 */
export function MarkdownEditor({
  name,
  label,
  defaultValue = "",
  rows = 8,
  placeholder,
  maxLength,
  hint,
  error,
  hideLabel,
  autoFocus,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  rows?: number;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
  error?: string;
  hideLabel?: boolean;
  autoFocus?: boolean;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");

  const applyTool = (tool: Tool) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const { text, select } = tool.apply(value.slice(start, end));
    const next = value.slice(0, start) + text + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      if (select) el.setSelectionRange(start + select[0], start + select[1]);
      else el.setSelectionRange(start + text.length, start + text.length);
    });
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-end justify-between gap-2">
        <label htmlFor={id} className={cn("text-sm font-semibold", hideLabel && "sr-only")}>
          {label}
        </label>
        <div role="tablist" aria-label={`${label} mode`} className="ml-auto inline-flex rounded-lg bg-subtle p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                "min-h-8 rounded-md px-3 text-[13px] font-semibold capitalize",
                tab === t ? "bg-card text-ink shadow-sm ring-1 ring-line" : "text-muted hover:text-ink",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("overflow-hidden rounded-lg border bg-card", error ? "border-danger" : "border-field")}>
        {tab === "write" && (
          <div className="flex flex-wrap gap-0.5 border-b border-line px-1.5 py-1" aria-label="Formatting" role="toolbar">
            {TOOLS.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onClick={() => applyTool(tool)}
                className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink"
                aria-label={tool.label}
                title={tool.label}
              >
                <tool.Icon size={16} />
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={ref}
          id={id}
          name={name}
          rows={rows}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          autoFocus={autoFocus}
          aria-invalid={Boolean(error) || undefined}
          className={cn(input, "block resize-y rounded-none border-0 font-sans leading-relaxed focus:outline-none", tab !== "write" && "hidden")}
        />
        {tab === "preview" && (
          <div className="min-h-32 px-4 py-3">
            {value.trim() ? <Markdown>{value}</Markdown> : <p className="text-muted">Nothing to preview yet.</p>}
          </div>
        )}
      </div>
      {error ? (
        <p className="mt-1.5 text-sm font-medium text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
