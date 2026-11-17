"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions/state";
import type { TopicStatus } from "@/db/schema";
import type { AttachmentView } from "@/lib/data/attachments";
import { LIMITS } from "@/lib/limits";
import { ExistingFiles } from "./existing-files";
import { FormError } from "./form-message";
import { MarkdownEditor } from "./markdown-editor";
import { STATUS_META, STATUS_ORDER } from "./status";
import { SubmitButton } from "./submit-button";
import { Uploader } from "./uploader";
import { button, card, input, label } from "./ui";

export type TopicDefaults = { title: string; task: string; goal: string; bodyMd: string; status: TopicStatus };

export function TopicForm({
  action,
  defaults,
  existingAttachments = [],
  maxMb,
  cancelHref,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: TopicDefaults;
  existingAttachments?: AttachmentView[];
  maxMb: number;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, {});
  const [uploading, setUploading] = useState(false);
  const v = { ...defaults, ...state.values } as TopicDefaults;

  return (
    <form action={formAction} className={`${card} flex flex-col gap-6 p-5 sm:p-7`}>
      <FormError>{state.error}</FormError>

      <div>
        <label htmlFor="title" className={label}>
          Title <span className="font-normal text-muted">(required)</span>
        </label>
        <input
          id="title"
          name="title"
          defaultValue={v.title}
          key={`title-${state.values?.title ?? ""}`}
          required
          maxLength={LIMITS.title}
          placeholder="e.g. Fix the squeaky garage door"
          className={`${input} text-[17px]`}
        />
      </div>

      <div>
        <label htmlFor="task" className={label}>
          Task <span className="font-normal text-muted">(required)</span>
        </label>
        <textarea
          id="task"
          name="task"
          rows={2}
          defaultValue={v.task}
          key={`task-${state.values?.task ?? ""}`}
          required
          maxLength={LIMITS.task}
          placeholder="What needs doing?"
          className={`${input} resize-y leading-relaxed`}
        />
      </div>

      <div>
        <label htmlFor="goal" className={label}>
          Goal <span className="font-normal text-muted">(required)</span>
        </label>
        <input
          id="goal"
          name="goal"
          defaultValue={v.goal}
          key={`goal-${state.values?.goal ?? ""}`}
          required
          maxLength={LIMITS.goal}
          placeholder="What does done look like?"
          className={input}
        />
      </div>

      <MarkdownEditor
        name="bodyMd"
        label="Notes"
        defaultValue={v.bodyMd}
        rows={9}
        maxLength={LIMITS.body}
        placeholder="Details, links, anything that helps."
        hint="Use the toolbar for bold, lists and links, or write Markdown directly."
      />

      <fieldset>
        <legend className={label}>Status</legend>
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((s) => (
            <label
              key={s}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-card px-3.5 text-sm font-medium has-[:checked]:border-ink has-[:checked]:ring-1 has-[:checked]:ring-ink"
            >
              <input type="radio" name="status" value={s} defaultChecked={v.status === s} className="accent-current" />
              {STATUS_META[s].label}
            </label>
          ))}
        </div>
      </fieldset>

      <ExistingFiles files={existingAttachments} />

      <Uploader maxMb={maxMb} label={existingAttachments.length > 0 ? "Add more files" : "Attachments"} onBusyChange={setUploading} />

      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-line pt-5">
        {uploading && <span className="mr-auto text-sm text-muted">Waiting for uploads to finish…</span>}
        <Link href={cancelHref} className={button("secondary")}>
          Cancel
        </Link>
        <SubmitButton pendingText="Saving…" disabled={uploading}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}
