import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { User } from "@/db/schema";
import { forbidden, invalid, notFound } from "@/lib/errors";
import { firstError, progressInputSchema, uuidListSchema } from "@/lib/validation";
import { attachmentsForEntries, deleteBlobs, linkAttachments, storageKeysForEntry, type AttachmentView } from "./attachments";
import { markRead } from "./reads";

const p = schema.progressEntries;
const u = schema.users;

export type EntryView = {
  id: string;
  authorId: string;
  authorName: string;
  bodyMd: string;
  createdAt: Date;
  updatedAt: Date;
  attachments: AttachmentView[];
};

export async function listEntries(topicId: string): Promise<EntryView[]> {
  const rows = await db()
    .select({
      id: p.id,
      authorId: p.authorId,
      authorName: sql<string>`coalesce(${u.displayName}, split_part(${u.email}, '@', 1))`,
      bodyMd: p.bodyMd,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })
    .from(p)
    .innerJoin(u, eq(u.id, p.authorId))
    .where(eq(p.topicId, topicId))
    .orderBy(asc(p.createdAt));
  const files = await attachmentsForEntries(rows.map((r) => r.id));
  return rows.map((r) => ({ ...r, attachments: files.get(r.id) ?? [] }));
}

function parse(input: unknown, ids: unknown) {
  const parsed = progressInputSchema.safeParse(input);
  if (!parsed.success) throw invalid(firstError(parsed.error));
  const parsedIds = uuidListSchema.safeParse(ids ?? []);
  if (!parsedIds.success) throw invalid(firstError(parsedIds.error));
  return { bodyMd: parsed.data.bodyMd, ids: parsedIds.data };
}

export async function addEntry(
  actor: User,
  topicId: string,
  input: unknown,
  attachmentIds: unknown = [],
): Promise<{ id: string; topicAuthorId: string; topicTitle: string }> {
  const { bodyMd, ids } = parse(input, attachmentIds);
  if (!bodyMd && ids.length === 0) throw invalid("Write something or attach a file.");

  const result = await db().transaction(async (tx) => {
    const [topic] = await tx
      .select({ id: schema.topics.id, authorId: schema.topics.authorId, title: schema.topics.title })
      .from(schema.topics)
      .where(eq(schema.topics.id, topicId))
      .limit(1);
    if (!topic) throw notFound("That topic");
    const [entry] = await tx.insert(p).values({ topicId, authorId: actor.id, bodyMd }).returning({ id: p.id });
    await linkAttachments(tx, actor, ids, { progressEntryId: entry.id });
    await tx.update(schema.topics).set({ lastActivityAt: new Date() }).where(eq(schema.topics.id, topicId));
    return { id: entry.id, topicAuthorId: topic.authorId, topicTitle: topic.title };
  });
  await markRead(actor.id, topicId);
  return result;
}

async function loadOwned(actor: User, entryId: string) {
  const [row] = await db().select({ id: p.id, authorId: p.authorId, topicId: p.topicId }).from(p).where(eq(p.id, entryId)).limit(1);
  if (!row) throw notFound("That update");
  if (row.authorId !== actor.id) throw forbidden("Only the person who wrote this update can change it.");
  return row;
}

export async function getOwnedEntry(actor: User, entryId: string) {
  const row = await loadOwned(actor, entryId);
  const [entry] = await db().select().from(p).where(eq(p.id, row.id)).limit(1);
  const files = await attachmentsForEntries([row.id]);
  return { ...entry, attachments: files.get(row.id) ?? [] };
}

export async function updateEntry(actor: User, entryId: string, input: unknown, attachmentIds: unknown = []): Promise<string> {
  const { bodyMd, ids } = parse(input, attachmentIds);
  const row = await loadOwned(actor, entryId);
  await db().transaction(async (tx) => {
    await tx.update(p).set({ bodyMd, updatedAt: new Date() }).where(eq(p.id, entryId));
    await linkAttachments(tx, actor, ids, { progressEntryId: entryId });
  });
  return row.topicId;
}

export async function deleteEntry(actor: User, entryId: string): Promise<string> {
  const row = await loadOwned(actor, entryId);
  const keys = await db().transaction(async (tx) => {
    const k = await storageKeysForEntry(tx, entryId);
    await tx.delete(p).where(eq(p.id, entryId));
    return k;
  });
  await deleteBlobs(keys);
  return row.topicId;
}
