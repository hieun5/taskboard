"use client";

import { useState } from "react";
import { removeAttachmentAction } from "@/app/actions/uploads";
import type { AttachmentView } from "@/lib/data/attachments";
import { formatBytes } from "@/lib/files";
import { FileBadge } from "./attachments";
import { FormError } from "./form-message";
import { XIcon } from "./icons";
import { label } from "./ui";

/** Files already attached to something you posted, each with a remove button. */
export function ExistingFiles({ files, title = "Attached files" }: { files: AttachmentView[]; title?: string }) {
  const [items, setItems] = useState(files);
  const [error, setError] = useState<string>();
  if (items.length === 0) return null;

  const remove = async (file: AttachmentView) => {
    if (!window.confirm(`Remove “${file.fileName}”?`)) return;
    const res = await removeAttachmentAction(file.id, { refresh: true });
    if (res.ok) setItems((l) => l.filter((f) => f.id !== file.id));
    else setError(res.error);
  };

  return (
    <div>
      <span className={label}>{title}</span>
      <FormError className="mb-2">{error}</FormError>
      <ul className="space-y-2">
        {items.map((f) => (
          <li key={f.id} className="flex items-center gap-3 rounded-xl border border-line p-2">
            <FileBadge mime={f.mimeType} className="size-9" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-semibold">{f.fileName}</span>
              <span className="text-[13px] text-muted">{formatBytes(f.sizeBytes)}</span>
            </span>
            <button
              type="button"
              onClick={() => remove(f)}
              className="inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
              aria-label={`Remove ${f.fileName}`}
            >
              <XIcon size={18} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
