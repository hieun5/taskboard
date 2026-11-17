"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { BoldIcon, CheckListIcon, HeadingIcon, ItalicIcon, LinkIcon, ListIcon, UploadIcon } from "./icons";
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

const hasFiles = (e: DragEvent | React.DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");

/**
 * Plain Markdown textarea with a small formatting toolbar and a Write/Preview switch.
 * Submits as an ordinary form field called `name`.
 *
 * With `onDropFiles`, the box also takes files: dragging files anywhere over the page
 * highlights it as the place to drop them.
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
  header,
  toolbarEnd,
  onDropFiles,
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
  /** Shown at the left of the Write/Preview row (e.g. the form's heading). */
  header?: React.ReactNode;
  /** Extra toolbar buttons, after the formatting tools (e.g. attach files). */
  toolbarEnd?: React.ReactNode;
  /** Makes the box a drop target for files. */
  onDropFiles?: (files: FileList) => void;
}) {
  const id = useId();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  // "page": files are being dragged somewhere over the window; "box": right over this box.
  const [fileDrag, setFileDrag] = useState<"none" | "page" | "box">("none");
  const acceptsFiles = Boolean(onDropFiles);

  useEffect(() => {
    if (!acceptsFiles) return;
    let depth = 0; // dragenter/leave fire for every child element, so count them.
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setFileDrag((d) => (d === "none" ? "page" : d));
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setFileDrag("none");
    };
    // Dropping outside the box would make the browser open the file and leave the page.
    const over = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "none";
    };
    const end = (e: DragEvent) => {
      if (e.type === "drop" && hasFiles(e)) e.preventDefault();
      depth = 0;
      setFileDrag("none");
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", end);
    window.addEventListener("dragend", end);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", end);
      window.removeEventListener("dragend", end);
    };
  }, [acceptsFiles]);

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
      <div className={cn("mb-1.5 flex flex-wrap justify-between gap-2", header ? "items-center" : "items-end")}>
        {header}
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

      <div
        className={cn(
          "relative overflow-hidden rounded-lg border bg-card transition-[border-color,box-shadow] duration-200",
          error ? "border-danger" : "border-field",
          fileDrag === "page" && "border-ink/60 ring-4 ring-ink/10",
          fileDrag === "box" && "border-ink ring-4 ring-ink/20",
        )}
        onDragEnter={acceptsFiles ? (e) => hasFiles(e) && setFileDrag("box") : undefined}
        onDragOver={
          acceptsFiles
            ? (e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                e.stopPropagation(); // keep the window handler from refusing the drop here
                e.dataTransfer.dropEffect = "copy";
                if (fileDrag !== "box") setFileDrag("box");
              }
            : undefined
        }
        onDragLeave={
          acceptsFiles
            ? (e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFileDrag("page");
              }
            : undefined
        }
        onDrop={
          acceptsFiles
            ? (e) => {
                if (!hasFiles(e)) return;
                e.preventDefault();
                setFileDrag("none");
                if (e.dataTransfer.files.length) onDropFiles?.(e.dataTransfer.files);
              }
            : undefined
        }
      >
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
            {toolbarEnd && (
              <>
                <span aria-hidden="true" className="mx-1 my-1.5 w-px self-stretch bg-line" />
                {toolbarEnd}
              </>
            )}
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
        {acceptsFiles && (
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-card/85 text-sm font-semibold text-ink backdrop-blur-[1px]",
              "transition-opacity duration-200 motion-reduce:transition-none",
              fileDrag === "none" ? "opacity-0" : "opacity-100",
            )}
          >
            <UploadIcon size={22} className={cn("transition-transform duration-200", fileDrag === "box" && "-translate-y-0.5 scale-110")} />
            Drop files to attach
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
