"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import type { User } from "@/db/schema";
import { env } from "@/env";
import { requireUser } from "@/lib/auth/dal";
import { getUserById } from "@/lib/data/members";
import { addEntry, deleteEntry, updateEntry } from "@/lib/data/progress";
import { sendMail } from "@/lib/mail";
import { progressEmail } from "@/lib/mail/templates";
import { formIds, formValues, toFormError } from "./handle";
import type { FormState } from "./state";
import { revalidateAll } from "./revalidate";

export async function addProgressAction(topicId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, ["bodyMd"]);
  let result: Awaited<ReturnType<typeof addEntry>>;
  try {
    result = await addEntry(user, topicId, values, formIds(formData));
  } catch (err) {
    return toFormError(err, values);
  }
  after(() => notifyTopicAuthor(user, topicId, result.topicAuthorId, result.topicTitle, values.bodyMd));
  revalidateAll();
  return { okAt: Date.now() };
}

/** Email the topic's author about new progress, unless they wrote it or opted out. */
async function notifyTopicAuthor(actor: User, topicId: string, authorId: string, title: string, body: string) {
  if (authorId === actor.id) return;
  try {
    const author = await getUserById(authorId);
    if (!author || !author.emailNotifications) return;
    const base = env().APP_URL;
    const excerpt = body.trim() ? (body.length > 400 ? `${body.slice(0, 400)}…` : body) : "(attached files)";
    await sendMail({
      to: author.email,
      ...progressEmail({
        authorName: actor.displayName ?? "Someone",
        topicTitle: title,
        excerpt,
        topicUrl: new URL(`/topics/${topicId}`, base).toString(),
        settingsUrl: new URL("/settings", base).toString(),
      }),
    });
  } catch (err) {
    console.error("[notify] progress email failed", err);
  }
}

export async function updateProgressAction(entryId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, ["bodyMd"]);
  let topicId: string;
  try {
    topicId = await updateEntry(user, entryId, values, formIds(formData));
  } catch (err) {
    return toFormError(err, values);
  }
  revalidateAll();
  redirect(`/topics/${topicId}#entry-${entryId}`);
}

export async function deleteProgressAction(entryId: string): Promise<void> {
  const user = await requireUser();
  const topicId = await deleteEntry(user, entryId);
  revalidateAll();
  redirect(`/topics/${topicId}`);
}
