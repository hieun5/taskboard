"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/state";
import { LIMITS } from "@/lib/limits";
import { FormError } from "./form-message";
import { MarkdownEditor } from "./markdown-editor";
import { SubmitButton } from "./submit-button";
import { Uploader } from "./uploader";
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
  return (
    <form action={formAction} className={`${card} p-4 sm:p-5`} aria-labelledby="composer-title">
      <h3 id="composer-title" className="mb-3 text-[17px] font-semibold">
        {title}
      </h3>
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
          placeholder="What did you get done? What's next?"
        />
        {children}
        <Uploader maxMb={maxMb} compact label="Files" onBusyChange={setUploading} />
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
