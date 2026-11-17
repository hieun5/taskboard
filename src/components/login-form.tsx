"use client";

import { useActionState, useState } from "react";
import { requestLinkAction } from "@/app/actions/auth";
import { FormError } from "./form-message";
import { MailIcon } from "./icons";
import { SubmitButton } from "./submit-button";
import { button, card, input } from "./ui";

export function LoginForm({ notice, next }: { notice?: string; next?: string }) {
  const [state, action] = useActionState(requestLinkAction, {});
  const [again, setAgain] = useState<number>();
  const sent = Boolean(state.okAt) && state.okAt !== again;

  if (sent) {
    return (
      <div className={`${card} px-6 py-8 sm:px-8`}>
        <span className="flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
          <MailIcon size={24} />
        </span>
        <h1 className="mt-5 font-serif text-[32px] font-medium tracking-tight">Check your inbox</h1>
        <p className="mt-2.5 leading-relaxed text-muted">
          If <strong className="text-ink">{state.values?.email}</strong> is on the invite list, a sign-in link is on its way. It works once and
          expires in an hour.
        </p>
        <button type="button" onClick={() => setAgain(state.okAt)} className={button("secondary", "md", "mt-6")}>
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form action={action} className={`${card} px-6 py-8 sm:px-8`}>
      <h1 className="font-serif text-[32px] font-medium tracking-tight">Sign in</h1>
      <div className="mt-6 space-y-4">
        <FormError>{state.error ?? notice}</FormError>
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="email" className="sr-only">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            defaultValue={state.values?.email}
            placeholder="name@email.com"
            className={`${input} min-h-12`}
          />
        </div>
        <SubmitButton pendingText="Sending…" className="min-h-12 w-full text-base">
          Email me a sign-in link
        </SubmitButton>
      </div>
    </form>
  );
}
