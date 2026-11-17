"use client";

import { useActionState } from "react";
import { saveNameAction } from "@/app/actions/auth";
import { LIMITS } from "@/lib/limits";
import { FormError } from "./form-message";
import { SubmitButton } from "./submit-button";
import { card, input, label } from "./ui";

export function WelcomeForm() {
  const [state, action] = useActionState(saveNameAction, {});
  return (
    <form action={action} className={`${card} px-6 py-8 sm:px-8`}>
      <h1 className="font-serif text-[32px] font-medium tracking-tight">Welcome!</h1>
      <p className="mt-2.5 text-muted">What should we call you? Others will see this name next to your posts.</p>
      <div className="mt-6 space-y-4">
        <FormError>{state.error}</FormError>
        <div>
          <label htmlFor="displayName" className={label}>
            Your name
          </label>
          <input
            id="displayName"
            name="displayName"
            required
            autoFocus
            maxLength={LIMITS.displayName}
            defaultValue={state.values?.displayName}
            placeholder="Your first name"
            className={`${input} min-h-12`}
          />
        </div>
        <SubmitButton pendingText="Saving…" className="min-h-12 w-full text-base">
          Continue to the board
        </SubmitButton>
      </div>
    </form>
  );
}
