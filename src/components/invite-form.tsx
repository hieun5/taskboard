"use client";

import { useActionState } from "react";
import { inviteAction } from "@/app/actions/members";
import { FormError, FormSuccess } from "./form-message";
import { SubmitButton } from "./submit-button";
import { card, input, label } from "./ui";

export function InviteForm({ canEmail }: { canEmail: boolean }) {
  const [state, action] = useActionState(inviteAction, {});
  return (
    <form action={action} className={`${card} p-5 sm:p-6`}>
      <h2 className="text-lg font-semibold">Invite someone</h2>
      <p className="mt-1 text-[15px] text-muted">They&apos;ll be able to sign in with this email address. No password needed.</p>
      <div className="mt-4 space-y-3">
        <FormError>{state.error}</FormError>
        <FormSuccess>{state.message}</FormSuccess>
        <div key={state.okAt ?? "form"}>
          <label htmlFor="invite-email" className={label}>
            Email
          </label>
          <div className="flex flex-wrap gap-2.5">
            <input
              id="invite-email"
              name="email"
              type="email"
              required
              autoComplete="off"
              defaultValue={state.error ? state.values?.email : ""}
              placeholder="name@email.com"
              className={`${input} min-w-0 flex-[1_1_240px]`}
            />
            <SubmitButton pendingText="Inviting…">Send invite</SubmitButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <label className="inline-flex min-h-9 items-center gap-2">
              <input type="checkbox" name="sendEmail" defaultChecked={canEmail} className="size-4 accent-current" />
              Email them a link to the site
            </label>
            <label className="inline-flex min-h-9 items-center gap-2">
              <input type="checkbox" name="isAdmin" className="size-4 accent-current" />
              Make them an admin (can invite others)
            </label>
          </div>
        </div>
      </div>
    </form>
  );
}
