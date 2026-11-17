"use server";

import { revalidateAll } from "./revalidate";
import { requireUser } from "@/lib/auth/dal";
import { finishUpload, removeAttachment, startUpload, type AttachmentView } from "@/lib/data/attachments";
import { AppError } from "@/lib/errors";
import type { UploadTarget } from "@/lib/storage";

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AppError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "The upload failed. Please try again." };
}

export async function startUploadAction(input: { fileName: string; size: number }): Promise<Result<{ id: string; upload: UploadTarget }>> {
  const user = await requireUser();
  try {
    return { ok: true, ...(await startUpload(user, { fileName: String(input.fileName), size: Number(input.size) })) };
  } catch (err) {
    return fail(err);
  }
}

export async function finishUploadAction(id: string): Promise<Result<{ attachment: AttachmentView }>> {
  const user = await requireUser();
  try {
    return { ok: true, attachment: await finishUpload(user, String(id)) };
  } catch (err) {
    return fail(err);
  }
}

/** Discard an unattached upload, or remove a file from something you posted. */
export async function removeAttachmentAction(id: string, opts: { refresh?: boolean } = {}): Promise<Result<object>> {
  const user = await requireUser();
  try {
    await removeAttachment(user, String(id));
  } catch (err) {
    return fail(err);
  }
  if (opts.refresh) revalidateAll();
  return { ok: true };
}
