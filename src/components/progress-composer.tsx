"use client";

import { useActionState, useRef, useState } from "react";
import type { FormState } from "@/app/actions/state";
import { LIMITS } from "@/lib/limits";
import { FormError } from "./form-message";
import { UploadIcon } from "./icons";
import { MarkdownEditor } from "./markdown-editor";
import { SubmitButton } from "./submit-button";
import { Uploader, type UploaderHandle } from "./uploader";
import { card } from "./ui";

export function ProgressComposer({
  action,
  maxMb,
  defaultValue = "",
  submitLabel = "Post update",
  title = "Add progress",
  children,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  maxMb: number;
  defaultValue?: string;
  submitLabel?: string;
  title?: string;
  children?: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  const [uploading, setUploading] = useState(false);
  const uploader = useRef<UploaderHandle>(null);
  return (
    <form action={formAction} className={`${card} p-4 sm:p-5`} aria-labelledby="composer-title">
      <FormError className="mb-3">{state.error}</FormError>
      {/* Remount the fields after each successful post so they start empty. */}
      <div key={state.okAt ?? "initial"} className="space-y-3">
        <MarkdownEditor
          name="bodyMd"
          label="Update"
          hideLabel
          rows={5}
          defaultValue={state.error ? (state.values?.bodyMd ?? defaultValue) : defaultValue}
          maxLength={LIMITS.progress}
          header={
            <h3 id="composer-title" className="text-[17px] font-semibold">
              {title}
            </h3>
          }
          toolbarEnd={
            <button
              type="button"
              onClick={() => uploader.current?.openPicker()}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-subtle hover:text-ink"
              aria-label={`Attach files (up to ${maxMb} MB each)`}
              title={`Attach files (up to ${maxMb} MB each)`}
            >
              <UploadIcon size={16} />
            </button>
          }
          onDropFiles={(files) => uploader.current?.addFiles(files)}
        />
        {children}
        <Uploader ref={uploader} bare maxMb={maxMb} onBusyChange={setUploading} />
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {uploading && <span className="mr-auto text-sm text-muted">Waiting for uploads…</span>}
        <SubmitButton pendingText="Posting…" disabled={uploading}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
