"use client";

import { useActionState } from "react";
import { saveSettingsAction } from "@/app/actions/members";
import { LIMITS } from "@/lib/limits";
import { FormError, FormSuccess } from "./form-message";
import { SubmitButton } from "./submit-button";
import { card, input, label } from "./ui";

export function SettingsForm({ displayName, emailNotifications }: { displayName: string; emailNotifications: boolean }) {
  const [state, action] = useActionState(saveSettingsAction, {});
  return (
    <form action={action} className={`${card} space-y-5 p-5 sm:p-6`}>
      <FormError>{state.error}</FormError>
      <FormSuccess>{state.message}</FormSuccess>
      <div>
        <label htmlFor="displayName" className={label}>
          Your name
        </label>
        <input
          id="displayName"
          name="displayName"
          required
          maxLength={LIMITS.displayName}
          defaultValue={state.values?.displayName ?? displayName}
          className={input}
        />
        <p className="mt-1.5 text-[13px] text-muted">Shown next to your topics and updates.</p>
      </div>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="emailNotifications" defaultChecked={emailNotifications} className="mt-1 size-4 accent-current" />
        <span>
          <span className="block font-semibold">Email me when someone adds progress to my topics</span>
          <span className="text-sm text-muted">One short email per update.</span>
        </span>
      </label>
      <div className="flex justify-end border-t border-line pt-5">
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
      </div>
    </form>
  );
}
