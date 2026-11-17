import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray, isNull, lt, or } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Attachment, User } from "@/db/schema";
import { env } from "@/env";
import { forbidden, invalid, notFound } from "@/lib/errors";
import { cleanFileName, fileTypeFor, formatBytes } from "@/lib/files";
import { storage, type UploadTarget } from "@/lib/storage";

type Tx = Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0];
const a = schema.attachments;

export type AttachmentView = Pick<Attachment, "id" | "fileName" | "mimeType" | "sizeBytes" | "uploaderId">;

const viewColumns = { id: a.id, fileName: a.fileName, mimeType: a.mimeType, sizeBytes: a.sizeBytes, uploaderId: a.uploaderId };

/** Step 1 of an upload: check the file, reserve a row, and hand back a signed upload URL. */
export async function startUpload(
  actor: User,
  input: { fileName: string; size: number },
): Promise<{ id: string; upload: UploadTarget }> {
  const fileName = cleanFileName(input.fileName);
  const type = fileTypeFor(fileName);
  if (!type) throw invalid(`“${fileName}” isn't a supported file type. Try a PDF, image, Office document, text file or zip.`);
  const max = env().MAX_UPLOAD_MB * 1024 * 1024;
  if (!Number.isInteger(input.size) || input.size <= 0) throw invalid(`“${fileName}” is empty.`);
  if (input.size > max) throw invalid(`“${fileName}” is ${formatBytes(input.size)}. Files can be up to ${env().MAX_UPLOAD_MB} MB.`);

  await cleanupStaleUploads().catch((err) => console.error("[attachments] cleanup failed", err));

  const now = new Date();
  const key = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID()}`;
  const [row] = await db()
    .insert(a)
    .values({ uploaderId: actor.id, storageKey: key, fileName, mimeType: type.mime, sizeBytes: input.size })
    .returning({ id: a.id });
  const upload = await storage().createUploadTarget(key, { contentType: type.mime, size: input.size, ownerId: actor.id });
  return { id: row.id, upload };
}

/** Step 2 of an upload: confirm the file really arrived with the size that was promised. */
export async function finishUpload(actor: User, id: string): Promise<AttachmentView> {
  const [row] = await db().select().from(a).where(eq(a.id, id)).limit(1);
  if (!row || row.uploaderId !== actor.id) throw notFound("That upload");
  if (row.status === "uploaded") return pickView(row);
  const size = await storage().size(row.storageKey);
  if (size === null || size !== row.sizeBytes) {
    await storage().delete(row.storageKey).catch(() => {});
    await db().delete(a).where(eq(a.id, id));
    throw invalid(`“${row.fileName}” didn't upload completely. Please try again.`);
  }
  await db().update(a).set({ status: "uploaded" }).where(eq(a.id, id));
  return pickView(row);
}

/** Attach finished uploads to a topic or progress entry, inside the caller's transaction. */
export async function linkAttachments(
  tx: Tx,
  actor: User,
  ids: string[],
  target: { topicId: string } | { progressEntryId: string },
): Promise<void> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const rows = await tx
    .update(a)
    .set(target)
    .where(
      and(
        inArray(a.id, unique),
        eq(a.uploaderId, actor.id),
        eq(a.status, "uploaded"),
        isNull(a.topicId),
        isNull(a.progressEntryId),
      ),
    )
    .returning({ id: a.id });
  if (rows.length !== unique.length) {
    throw invalid("One of the files didn't finish uploading. Remove it and try again.");
  }
}

/**
 * Remove a file. Unattached uploads can be discarded by whoever uploaded them; attached
 * files can be removed by the author of the topic or progress entry they belong to.
 */
export async function removeAttachment(actor: User, id: string): Promise<void> {
  const [row] = await db()
    .select({
      attachment: a,
      topicAuthor: schema.topics.authorId,
      entryAuthor: schema.progressEntries.authorId,
    })
    .from(a)
    .leftJoin(schema.topics, eq(schema.topics.id, a.topicId))
    .leftJoin(schema.progressEntries, eq(schema.progressEntries.id, a.progressEntryId))
    .where(eq(a.id, id))
    .limit(1);
  if (!row) throw notFound("That file");
  const { attachment } = row;
  const owner = attachment.topicId ? row.topicAuthor : attachment.progressEntryId ? row.entryAuthor : attachment.uploaderId;
  if (owner !== actor.id) throw forbidden("Only the person who posted this can remove the file.");
  await db().delete(a).where(eq(a.id, id));
  await storage().delete(attachment.storageKey).catch((err) => console.error("[attachments] delete blob failed", err));
}

/** Look up a file for download. Any member may read attached files; unattached ones only by their uploader. */
export async function getDownloadable(viewer: User, id: string): Promise<Attachment> {
  const [row] = await db().select().from(a).where(and(eq(a.id, id), eq(a.status, "uploaded"))).limit(1);
  if (!row) throw notFound("That file");
  if (!row.topicId && !row.progressEntryId && row.uploaderId !== viewer.id) throw notFound("That file");
  return row;
}

export async function attachmentsForTopic(topicId: string): Promise<AttachmentView[]> {
  return db()
    .select(viewColumns)
    .from(a)
    .where(and(eq(a.topicId, topicId), eq(a.status, "uploaded")))
    .orderBy(a.createdAt);
}

export async function attachmentsForEntries(entryIds: string[]): Promise<Map<string, AttachmentView[]>> {
  const map = new Map<string, AttachmentView[]>();
  if (entryIds.length === 0) return map;
  const rows = await db()
    .select({ ...viewColumns, entryId: a.progressEntryId })
    .from(a)
    .where(and(inArray(a.progressEntryId, entryIds), eq(a.status, "uploaded")))
    .orderBy(a.createdAt);
  for (const { entryId, ...view } of rows) {
    const list = map.get(entryId!) ?? [];
    list.push(view);
    map.set(entryId!, list);
  }
  return map;
}

/** Storage keys of every file on a topic and its progress entries (for cleanup on delete). */
export async function storageKeysForTopic(tx: Tx, topicId: string): Promise<string[]> {
  const rows = await tx
    .select({ key: a.storageKey })
    .from(a)
    .where(
      or(
        eq(a.topicId, topicId),
        inArray(a.progressEntryId, tx.select({ id: schema.progressEntries.id }).from(schema.progressEntries).where(eq(schema.progressEntries.topicId, topicId))),
      ),
    );
  return rows.map((r) => r.key);
}

export async function storageKeysForEntry(tx: Tx, entryId: string): Promise<string[]> {
  const rows = await tx.select({ key: a.storageKey }).from(a).where(eq(a.progressEntryId, entryId));
  return rows.map((r) => r.key);
}

export async function deleteBlobs(keys: string[]): Promise<void> {
  await Promise.all(keys.map((k) => storage().delete(k).catch((err) => console.error("[attachments] delete blob failed", k, err))));
}

/** Forget uploads that were never attached to anything within a day. */
export async function cleanupStaleUploads(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const stale = await db()
    .delete(a)
    .where(and(isNull(a.topicId), isNull(a.progressEntryId), lt(a.createdAt, cutoff)))
    .returning({ key: a.storageKey });
  await deleteBlobs(stale.map((s) => s.key));
  return stale.length;
}

function pickView(row: Attachment): AttachmentView {
  return { id: row.id, fileName: row.fileName, mimeType: row.mimeType, sizeBytes: row.sizeBytes, uploaderId: row.uploaderId };
}

