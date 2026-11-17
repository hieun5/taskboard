"use server";

import { env } from "@/env";
import { requireAdmin, requireUser } from "@/lib/auth/dal";
import { inviteMember, revokeInvite, updateProfile } from "@/lib/data/members";
import { markRead } from "@/lib/data/reads";
import { sendMail } from "@/lib/mail";
import { inviteEmail } from "@/lib/mail/templates";
import { uuidSchema } from "@/lib/validation";
import { toFormError } from "./handle";
import type { FormState } from "./state";
import { revalidateAll } from "./revalidate";

export async function inviteAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAdmin();
  const email = String(formData.get("email") ?? "");
  const makeAdmin = formData.get("isAdmin") === "on";
  const notify = formData.get("sendEmail") === "on";
  try {
    const result = await inviteMember(user, email, makeAdmin);
    if (result.alreadyMember) return { error: `${result.email} is already a member.`, values: { email } };
    let message = `Invited ${result.email}.`;
    if (notify) {
      try {
        await sendMail({
          to: result.email,
          ...inviteEmail({ inviterName: user.displayName ?? "A member", loginUrl: new URL("/login", env().APP_URL).toString() }),
        });
        message += " We emailed them how to sign in.";
      } catch (err) {
        console.error("[invite] email failed", err);
        message += " The invite is saved, but the email couldn't be sent; tell them to sign in at the site.";
      }
    } else {
      message += " Tell them to sign in with that email.";
    }
    revalidateAll();
    return { okAt: Date.now(), message };
  } catch (err) {
    return toFormError(err, { email });
  }
}

export async function revokeInviteAction(email: string): Promise<void> {
  const user = await requireAdmin();
  await revokeInvite(user, email);
  revalidateAll();
}

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "");
  try {
    await updateProfile(user, { displayName, emailNotifications: formData.get("emailNotifications") === "on" });
  } catch (err) {
    return toFormError(err, { displayName });
  }
  revalidateAll();
  return { okAt: Date.now(), message: "Saved." };
}

export async function markReadAction(topicId: string): Promise<void> {
  const user = await requireUser();
  const id = uuidSchema.safeParse(topicId);
  if (id.success) await markRead(user.id, id.data);
}
