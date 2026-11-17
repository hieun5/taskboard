import "server-only";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import type { TopicStatus, User } from "@/db/schema";
import { forbidden, invalid, notFound } from "@/lib/errors";
import { firstError, topicInputSchema, topicStatusSchema, uuidListSchema, type TopicInput } from "@/lib/validation";
import { attachmentsForTopic, deleteBlobs, linkAttachments, storageKeysForTopic } from "./attachments";
import { markRead } from "./reads";

const t = schema.topics;
const u = schema.users;

export type BoardFilter = { q?: string; status?: TopicStatus | "all"; sort?: "newest" | "active" };

export type BoardTopic = {
  id: string;
  title: string;
  goal: string;
  status: TopicStatus;
  createdAt: Date;
  lastActivityAt: Date;
  authorId: string;
  authorName: string;
  updates: number;
  files: number;
  unread: boolean;
};

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

export async function listTopics(viewer: User, filter: BoardFilter = {}): Promise<BoardTopic[]> {
  const where: SQL[] = [];
  const q = filter.q?.trim();
  if (q) {
    const pattern = `%${escapeLike(q.slice(0, 100))}%`;
    where.push(or(ilike(t.title, pattern), ilike(t.goal, pattern), ilike(t.task, pattern))!);
  }
  if (filter.status && filter.status !== "all") where.push(eq(t.status, filter.status));

  const rows = await db()
    .select({
      id: t.id,
      title: t.title,
      goal: t.goal,
      status: t.status,
      createdAt: t.createdAt,
      lastActivityAt: t.lastActivityAt,
      authorId: t.authorId,
      authorName: sql<string>`coalesce(${u.displayName}, split_part(${u.email}, '@', 1))`,
      updates: sql<number>`(select count(*)::int from progress_entries pe where pe.topic_id = ${t.id})`,
      files: sql<number>`(select count(*)::int from attachments at where at.status = 'uploaded' and (at.topic_id = ${t.id} or at.progress_entry_id in (select pe.id from progress_entries pe where pe.topic_id = ${t.id})))`,
      unread: sql<boolean>`(select case when tr.last_read_at is null then true else ${t.lastActivityAt} > tr.last_read_at end from (select 1) one left join topic_reads tr on tr.topic_id = ${t.id} and tr.user_id = ${viewer.id})`,
    })
    .from(t)
    .innerJoin(u, eq(u.id, t.authorId))
    .where(where.length ? and(...where) : undefined)
    .orderBy(filter.sort === "active" ? desc(t.lastActivityAt) : desc(t.createdAt))
    .limit(300);

  // Your own new topic is never "new" to you.
  return rows.map((r) => ({ ...r, unread: r.unread && !(r.authorId === viewer.id && r.updates === 0) }));
}

export async function getTopic(id: string) {
  const [row] = await db()
    .select({ topic: t, authorName: sql<string>`coalesce(${u.displayName}, split_part(${u.email}, '@', 1))` })
    .from(t)
    .innerJoin(u, eq(u.id, t.authorId))
    .where(eq(t.id, id))
    .limit(1);
  if (!row) throw notFound("That topic");
  const attachments = await attachmentsForTopic(id);
  return { ...row.topic, authorName: row.authorName, attachments };
}

function parseTopic(input: unknown): TopicInput {
  const parsed = topicInputSchema.safeParse(input);
  if (!parsed.success) throw invalid(firstError(parsed.error));
  return parsed.data;
}

function parseIds(ids: unknown): string[] {
  const parsed = uuidListSchema.safeParse(ids ?? []);
  if (!parsed.success) throw invalid(firstError(parsed.error));
  return parsed.data;
}

export async function createTopic(actor: User, input: unknown, attachmentIds: unknown = []): Promise<string> {
  const data = parseTopic(input);
  const ids = parseIds(attachmentIds);
  const id = await db().transaction(async (tx) => {
    const [row] = await tx
      .insert(t)
      .values({ ...data, authorId: actor.id })
      .returning({ id: t.id });
    await linkAttachments(tx, actor, ids, { topicId: row.id });
    return row.id;
  });
  await markRead(actor.id, id);
  return id;
}

async function loadOwned(actor: User, id: string) {
  const [row] = await db().select({ id: t.id, authorId: t.authorId }).from(t).where(eq(t.id, id)).limit(1);
  if (!row) throw notFound("That topic");
  if (row.authorId !== actor.id) throw forbidden("Only the person who posted this topic can change it.");
  return row;
}

export async function updateTopic(actor: User, id: string, input: unknown, attachmentIds: unknown = []): Promise<void> {
  const data = parseTopic(input);
  const ids = parseIds(attachmentIds);
  await loadOwned(actor, id);
  await db().transaction(async (tx) => {
    await tx.update(t).set({ ...data, updatedAt: new Date() }).where(eq(t.id, id));
    await linkAttachments(tx, actor, ids, { topicId: id });
  });
}

export async function setTopicStatus(actor: User, id: string, status: unknown): Promise<void> {
  const parsed = topicStatusSchema.safeParse(status);
  if (!parsed.success) throw invalid("Pick a valid status.");
  await loadOwned(actor, id);
  await db().update(t).set({ status: parsed.data, updatedAt: new Date() }).where(eq(t.id, id));
}

export async function deleteTopic(actor: User, id: string): Promise<void> {
  await loadOwned(actor, id);
  const keys = await db().transaction(async (tx) => {
    const k = await storageKeysForTopic(tx, id);
    await tx.delete(t).where(eq(t.id, id));
    return k;
  });
  await deleteBlobs(keys);
}
