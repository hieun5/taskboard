import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const r = schema.topicReads;

/** Record that a member has seen everything on a topic up to now. */
export async function markRead(userId: string, topicId: string): Promise<void> {
  const now = new Date();
  await db()
    .insert(r)
    .values({ userId, topicId, lastReadAt: now })
    .onConflictDoUpdate({ target: [r.userId, r.topicId], set: { lastReadAt: now } });
}

export async function lastReadAt(userId: string, topicId: string): Promise<Date | null> {
  const [row] = await db()
    .select({ at: r.lastReadAt })
    .from(r)
    .where(and(eq(r.userId, userId), eq(r.topicId, topicId)))
    .limit(1);
  return row?.at ?? null;
}
