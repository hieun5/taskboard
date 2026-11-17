"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/dal";
import { createTopic, deleteTopic, setTopicStatus, updateTopic } from "@/lib/data/topics";
import { formIds, formValues, toFormError } from "./handle";
import type { FormState } from "./state";
import { revalidateAll } from "./revalidate";

const FIELDS = ["title", "task", "goal", "bodyMd", "status"];

export async function createTopicAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, FIELDS);
  let id: string;
  try {
    id = await createTopic(user, values, formIds(formData));
  } catch (err) {
    return toFormError(err, values);
  }
  revalidateAll();
  redirect(`/topics/${id}`);
}

export async function updateTopicAction(topicId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(formData, FIELDS);
  try {
    await updateTopic(user, topicId, values, formIds(formData));
  } catch (err) {
    return toFormError(err, values);
  }
  revalidateAll();
  redirect(`/topics/${topicId}`);
}

export async function setStatusAction(topicId: string, formData: FormData): Promise<void> {
  const user = await requireUser();
  await setTopicStatus(user, topicId, formData.get("status"));
  revalidateAll();
}

export async function deleteTopicAction(topicId: string): Promise<void> {
  const user = await requireUser();
  await deleteTopic(user, topicId);
  revalidateAll();
  redirect("/");
}
