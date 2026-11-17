"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { finishUploadAction, removeAttachmentAction, startUploadAction } from "@/app/actions/uploads";
import { cn } from "@/lib/cn";
import { ACCEPT_ATTRIBUTE, formatBytes, kindForMime } from "@/lib/files";
import { KIND_STYLE } from "./attachments";
import { FileIcon, ImageIcon, UploadIcon, XIcon } from "./icons";

type Item = {
  key: string;
  name: string;
  size: number;
  mime?: string;
  state: "uploading" | "done" | "error";
  progress: number;
  id?: string;
  error?: string;
  xhr?: XMLHttpRequest;
};

function put(url: string, headers: Record<string, string>, file: File, onProgress: (p: number) => void) {
  const xhr = new XMLHttpRequest();
  const done = new Promise<void>((resolve, reject) => {
    xhr.open("PUT", url);
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)));
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    xhr.send(file);
  });
  return { xhr, done };
}

/** Lets a parent (e.g. the progress composer) open the file picker or hand over dropped files. */
export type UploaderHandle = { addFiles: (files: FileList | File[]) => void; openPicker: () => void };

/**
 * Drag-and-drop uploader. Files go straight to storage through short-lived signed URLs;
 * finished uploads are submitted with the surrounding form as `attachmentIds`.
 */
export function Uploader({
  name = "attachmentIds",
  maxMb,
  label = "Attachments",
  onBusyChange,
  bare,
  ref,
}: {
  name?: string;
  maxMb: number;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
  /** Only the list of picked files; the parent supplies the drop target and picker button (via `ref`). */
  bare?: boolean;
  ref?: React.Ref<UploaderHandle>;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const update = (key: string, patch: Partial<Item>) => setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const busy = items.some((i) => i.state === "uploading");
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);

  const addFiles = (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      if (file.size > maxMb * 1024 * 1024) {
        setItems((l) => [...l, { key, name: file.name, size: file.size, state: "error", progress: 0, error: `Too big: files can be up to ${maxMb} MB.` }]);
        continue;
      }
      setItems((l) => [...l, { key, name: file.name, size: file.size, state: "uploading", progress: 0 }]);
      void (async () => {
        try {
          const started = await startUploadAction({ fileName: file.name, size: file.size });
          if (!started.ok) throw new Error(started.error);
          update(key, { id: started.id, mime: started.upload.headers["Content-Type"] });
          const { xhr, done } = put(started.upload.url, started.upload.headers, file, (p) => update(key, { progress: p }));
          update(key, { xhr });
          await done;
          const finished = await finishUploadAction(started.id);
          if (!finished.ok) throw new Error(finished.error);
          update(key, { state: "done", progress: 1, xhr: undefined });
        } catch (err) {
          update(key, { state: "error", error: err instanceof Error ? err.message : "Upload failed", xhr: undefined });
        }
      })();
    }
  };

  const remove = (item: Item) => {
    item.xhr?.abort();
    setItems((l) => l.filter((i) => i.key !== item.key));
    if (item.id) void removeAttachmentAction(item.id);
  };

  useImperativeHandle(ref, () => ({ addFiles, openPicker: () => inputRef.current?.click() }));

  const fileList =
    items.length > 0 ? (
      <ul className={cn("space-y-2", !bare && "mt-3")} aria-live="polite">
        {items.map((item) => {
          const kind = item.mime ? kindForMime(item.mime) : null;
          return (
            <li key={item.key} className="flex items-center gap-3 rounded-xl border border-line bg-card p-2">
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold",
                  kind ? KIND_STYLE[kind].cls : "bg-subtle text-muted",
                )}
              >
                {kind === "image" ? <ImageIcon size={16} /> : kind === "pdf" ? "PDF" : <FileIcon size={16} />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="truncate text-sm font-semibold">{item.name}</span>
                {item.state === "uploading" ? (
                  <span className="flex items-center gap-2.5">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-subtle">
                      <span className="block h-full bg-ink transition-[width]" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                    </span>
                    <span className="text-[13px] tabular-nums text-muted">{Math.round(item.progress * 100)}%</span>
                  </span>
                ) : item.state === "error" ? (
                  <span className="text-[13px] font-medium text-danger">{item.error}</span>
                ) : (
                  <span className="text-[13px] text-muted">{formatBytes(item.size)} · ready</span>
                )}
              </span>
              {item.state === "done" && item.id && <input type="hidden" name={name} value={item.id} />}
              <button
                type="button"
                onClick={() => remove(item)}
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
                aria-label={item.state === "uploading" ? `Cancel upload of ${item.name}` : `Remove ${item.name}`}
              >
                <XIcon size={18} />
              </button>
            </li>
          );
        })}
      </ul>
    ) : null;

  const fileInput = (
    <input
      ref={inputRef}
      id={inputId}
      type="file"
      multiple
      accept={ACCEPT_ATTRIBUTE}
      className="sr-only"
      tabIndex={-1}
      aria-label="Choose files to attach"
      onChange={(e) => {
        if (e.target.files) addFiles(e.target.files);
        e.target.value = "";
      }}
    />
  );

  if (bare) {
    return (
      <div>
        {fileInput}
        {fileList}
      </div>
    );
  }

  return (
    <div>
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border-[1.5px] border-dashed px-5 py-6 text-center text-sm text-muted transition-colors",
          dragging ? "border-ink bg-subtle" : "border-line bg-page",
        )}
      >
        <UploadIcon size={22} />
        <span>
          Drag files here or{" "}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="min-h-9 font-semibold text-ink underline underline-offset-2 hover:no-underline"
          >
            browse
          </button>
        </span>
        <span className="text-[13px]">PDFs, images, documents · up to {maxMb} MB each</span>
        {fileInput}
      </div>

      {fileList}
    </div>
  );
}
