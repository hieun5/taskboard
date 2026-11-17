"use server";

import { redirect } from "next/navigation";
import { endSession, requireUser, startSession } from "@/lib/auth/dal";
import { consumeLoginToken, isSafeNext, requestLoginLink } from "@/lib/auth/login";
import { updateProfile } from "@/lib/data/members";
import { emailSchema, firstError } from "@/lib/validation";
import { toFormError } from "./handle";
import type { FormState } from "./state";
import { revalidateAll } from "./revalidate";

export async function requestLinkAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = String(formData.get("email") ?? "");
  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) return { error: firstError(parsed.error), values: { email: raw } };
  try {
    await requestLoginLink(parsed.data, String(formData.get("next") ?? ""));
  } catch (err) {
    console.error("[auth] could not send sign-in link", err);
    return { error: "We couldn't send the email just now. Please try again in a minute.", values: { email: raw } };
  }
  // Same answer whether or not the address is invited.
  return { okAt: Date.now(), values: { email: parsed.data } };
}

function safeNext(next: unknown): string {
  return typeof next === "string" && isSafeNext(next) ? next : "/";
}

export async function verifyLinkAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  const result = await consumeLoginToken(token);
  if (!result.ok) redirect(`/login?error=${result.reason}`);
  await startSession(result.userId);
  revalidateAll();
  redirect(result.needsName ? "/welcome" : safeNext(formData.get("next")));
}

export async function signOutAction(): Promise<void> {
  await endSession();
  revalidateAll();
  redirect("/login");
}

export async function saveNameAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser({ allowMissingName: true });
  const displayName = String(formData.get("displayName") ?? "");
  try {
    await updateProfile(user, { displayName });
  } catch (err) {
    return toFormError(err, { displayName });
  }
  revalidateAll();
  redirect("/");
}
