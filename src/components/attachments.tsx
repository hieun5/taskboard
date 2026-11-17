import type { AttachmentView } from "@/lib/data/attachments";
import { cn } from "@/lib/cn";
import { formatBytes, isPreviewableImage, kindForMime, opensInline, type FileKind } from "@/lib/files";
import { FileIcon, ImageIcon } from "./icons";

export const KIND_STYLE: Record<FileKind, { label: string; cls: string }> = {
  pdf: { label: "PDF", cls: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300" },
  image: { label: "IMG", cls: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300" },
  doc: { label: "DOC", cls: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300" },
  sheet: { label: "XLS", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300" },
  slides: { label: "PPT", cls: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300" },
  text: { label: "TXT", cls: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
  archive: { label: "ZIP", cls: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300" },
};

export function FileBadge({ mime, className }: { mime: string; className?: string }) {
  const kind = kindForMime(mime);
  const style = KIND_STYLE[kind];
  return (
    <span
      aria-hidden="true"
      className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold", style.cls, className)}
    >
      {kind === "image" ? <ImageIcon size={18} /> : kind === "pdf" ? style.label : <FileIcon size={18} />}
    </span>
  );
}

export function fileHref(id: string) {
  return `/files/${id}`;
}

/** Image thumbnails first, then file chips. */
export function AttachmentList({ items, className }: { items: AttachmentView[]; className?: string }) {
  if (items.length === 0) return null;
  const images = items.filter((f) => isPreviewableImage(f.mimeType));
  const others = items.filter((f) => !isPreviewableImage(f.mimeType));
  return (
    <div className={cn("space-y-3", className)}>
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((f) => (
            <a
              key={f.id}
              href={fileHref(f.id)}
              target="_blank"
              rel="noopener"
              className="group relative block overflow-hidden rounded-xl border border-line bg-subtle"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- private, signed file URLs */}
              <img src={fileHref(f.id)} alt={f.fileName} loading="lazy" className="aspect-[4/3] w-full object-cover transition group-hover:opacity-90" />
              <span className="block truncate border-t border-line bg-card px-2.5 py-1.5 text-xs text-muted">
                {f.fileName} · {formatBytes(f.sizeBytes)}
              </span>
            </a>
          ))}
        </div>
      )}
      {others.length > 0 && (
        <ul className="flex flex-wrap gap-2.5">
          {others.map((f) => (
            <li key={f.id} className="min-w-0 max-w-full">
              <a
                href={fileHref(f.id)}
                {...(opensInline(f.mimeType) ? { target: "_blank", rel: "noopener" } : { download: f.fileName })}
                className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-card py-2 pl-2 pr-4 hover:bg-subtle"
              >
                <FileBadge mime={f.mimeType} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-semibold">{f.fileName}</span>
                  <span className="text-[13px] text-muted">
                    {formatBytes(f.sizeBytes)} · {opensInline(f.mimeType) ? "opens in new tab" : "download"}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
